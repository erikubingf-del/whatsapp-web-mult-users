import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import next from 'next';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { browserManager } from './server/engine/browser';
import { ensureSessionsDir } from './server/engine/session';
import { sessionManager } from './server/engine/session_manager';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { getToken } from 'next-auth/jwt';
import { Scraper } from './server/engine/scraper';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import {
  validateBody,
  validateQuery,
  createProfileSchema,
  updateProfileSchema,
  registerSchema,
  settingsSchema,
  subscriptionSchema,
  interactClickSchema,
  interactScrollSchema,
  advancedSearchSchema
} from './server/validation';
import { initializeEncryption, encryptionService } from './server/services/encryption';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    sub: string;
    email: string;
    tier: string;
    name?: string;
  };
  tenantId?: string;
  requestId?: string;
}

// ============================================
// INITIALIZATION
// ============================================

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

(async () => {
  try {
    await ensureSessionsDir();
    await app.prepare();

    const server = express();

    // ============================================
    // SECURITY: CORS Configuration (Task 1.5)
    // ============================================
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    server.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));

    // ============================================
    // SECURITY: Security Headers (Task 1.7)
    // ============================================
    server.use((_req: Request, res: Response, next: NextFunction) => {
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      // XSS Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      // HSTS (only in production with HTTPS)
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
      next();
    });

    // ============================================
    // MIDDLEWARE: Body Parser & Cookie Parser
    // ============================================
    server.use(bodyParser.json({ limit: '10mb' }));
    server.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    server.use(cookieParser());

    // ============================================
    // MIDDLEWARE: Request ID Tracking
    // ============================================
    server.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // ============================================
    // MIDDLEWARE: Request Logging (Task 1.8 - Conditional)
    // ============================================
    if (dev) {
      server.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
          // Don't log sensitive body data, just method/path/status
          console.log(`[${req.requestId?.slice(0, 8)}] ${req.method} ${req.path} - ${res.statusCode} (${Date.now() - start}ms)`);
        });
        next();
      });
    }

    // ============================================
    // SECURITY: Rate Limiting (Task 1.6)
    // ============================================
    const apiLimiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
      message: { error: 'Too many requests, please try again later' },
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 attempts per 15 minutes
      message: { error: 'Too many authentication attempts, please try again later' },
      standardHeaders: true,
      legacyHeaders: false
    });

    const scrapeLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 scrape requests per minute
      message: { error: 'Too many scrape requests, please wait before trying again' }
    });

    // Apply rate limiters
    server.use('/api/', apiLimiter);

    // ============================================
    // SECURITY: JWT Verification Middleware (Task 1.2)
    // ============================================
    const authenticateJWT = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      try {
        const token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET
        });

        if (token) {
          req.user = {
            id: token.sub as string,
            sub: token.sub as string,
            email: token.email as string,
            tier: (token.tier as string) || 'STARTER',
            name: token.name as string
          };

          // Get tenant for this user
          const tenant = await prisma.tenant.findFirst({
            where: { userId: token.sub as string }
          });
          req.tenantId = tenant?.id;
        }
      } catch (e) {
        console.error('JWT verification error:', e);
      }
      next();
    };

    // Apply JWT middleware to all routes
    server.use(authenticateJWT);

    // ============================================
    // AUTH MIDDLEWARE: Require Authentication
    // ============================================
    const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (!req.tenantId && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'No tenant associated with user' });
      }
      next();
    };

    // ============================================
    // AUTH MIDDLEWARE: Verify Profile Ownership
    // ============================================
    const verifyProfileOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const profileId = req.params.id;
      const tenantId = req.tenantId;

      if (!tenantId && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // In dev mode without auth, allow access
      if (!tenantId && dev) {
        return next();
      }

      const profile = await prisma.profile.findFirst({
        where: { id: profileId, tenantId }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found or access denied' });
      }

      next();
    };

    // ============================================
    // HTTP SERVER & SOCKET.IO SETUP
    // ============================================
    const httpServer = createServer(server);
    const io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true
      }
    });

    // ============================================
    // Initialize Browser Engine
    // ============================================
    await browserManager.init();

    // Restore active sessions
    console.log('Restoring active sessions...');
    await sessionManager.startAllSessions();
    console.log('Sessions restored.');

    // ============================================
    // SECURITY: Socket.IO Authentication (Task 1.3)
    // ============================================
    io.use(async (socket, next) => {
      try {
        // Get token from handshake auth or cookie
        let token = socket.handshake.auth.token;

        // Try to get token from cookies if not in auth
        if (!token) {
          const cookies = socket.handshake.headers.cookie;
          if (cookies) {
            // Parse cookies manually
            const cookieMap = cookies.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = value;
              return acc;
            }, {} as Record<string, string>);

            // NextAuth uses these cookie names
            token = cookieMap['next-auth.session-token'] ||
                    cookieMap['__Secure-next-auth.session-token'];
          }
        }

        // In development, allow connections without auth for testing
        if (!token && dev) {
          console.log('Socket connected without auth (dev mode):', socket.id);
          (socket as any).user = null;
          (socket as any).tenantId = 'default-tenant';
          return next();
        }

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify the JWT token
        const jwt = await import('next-auth/jwt');
        const decoded = await jwt.decode({
          token,
          secret: process.env.NEXTAUTH_SECRET!
        });

        if (!decoded) {
          return next(new Error('Invalid token'));
        }

        // Attach user info to socket
        (socket as any).user = decoded;

        // Get tenant
        const tenant = await prisma.tenant.findFirst({
          where: { userId: decoded.sub as string }
        });
        (socket as any).tenantId = tenant?.id;

        console.log('Socket authenticated:', socket.id, 'User:', decoded.email);
        next();
      } catch (e: any) {
        console.error('Socket auth error:', e.message);
        // In dev mode, allow connection even if auth fails
        if (dev) {
          (socket as any).user = null;
          (socket as any).tenantId = 'default-tenant';
          return next();
        }
        next(new Error('Authentication failed'));
      }
    });

    // ============================================
    // SOCKET.IO EVENT HANDLERS
    // ============================================
    io.on('connection', (socket) => {
      const tenantId = (socket as any).tenantId;
      const _user = (socket as any).user; // Stored for potential future use
      console.log('Client connected:', socket.id, 'Tenant:', tenantId || 'default');

      socket.on('join-session', async (profileId) => {
        try {
          // Verify profile belongs to tenant (unless dev mode without auth)
          if (tenantId && tenantId !== 'default-tenant') {
            const profile = await prisma.profile.findFirst({
              where: { id: profileId, tenantId }
            });

            if (!profile) {
              socket.emit('error', { message: 'Profile not found or access denied' });
              return;
            }
          }

          console.log(`Socket ${socket.id} joining session ${profileId}`);
          socket.join(profileId);

          // Start screencast
          browserManager.startScreencast(profileId, (buffer) => {
            io.to(profileId).emit('frame', buffer.toString('base64'));
          });
        } catch (e: any) {
          console.error('Error joining session:', e);
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      socket.on('leave-session', (profileId) => {
        console.log(`Socket ${socket.id} leaving session ${profileId}`);
        socket.leave(profileId);

        // Check if room is empty, if so, stop screencast
        const room = io.sockets.adapter.rooms.get(profileId);
        if (!room || room.size === 0) {
          browserManager.stopScreencast(profileId);
        }
      });

      socket.on('input', async (data) => {
        const { profileId, event } = data;

        // Verify access in production
        if (tenantId && tenantId !== 'default-tenant') {
          const profile = await prisma.profile.findFirst({
            where: { id: profileId, tenantId }
          });
          if (!profile) return;
        }

        browserManager.injectInput(profileId, event);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // ============================================
    // API ROUTES: Profile Management (Protected)
    // ============================================
    server.post('/api/profiles', requireAuth, validateBody(createProfileSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { name, phoneNumber } = req.body;
        let tenantId = req.tenantId;

        // Handle tenant creation/lookup
        if (req.user && !tenantId) {
          // If user exists but no tenant, create one for them
          const newTenant = await prisma.tenant.create({
            data: {
              name: `${req.user.name || 'User'}'s Organization`,
              userId: req.user.id
            }
          });
          tenantId = newTenant.id;
        } else if (!tenantId && dev) {
          // Dev fallback
          let defaultTenant = await prisma.tenant.findFirst({ where: { id: 'default-tenant' } });
          if (!defaultTenant) {
            defaultTenant = await prisma.tenant.create({ data: { id: 'default-tenant', name: 'Default Tenant' } });
          }
          tenantId = defaultTenant.id;
        }

        if (!tenantId) {
          return res.status(400).json({ error: 'Could not determine tenant' });
        }

        // Enforce Tier Limits
        const currentCount = await prisma.profile.count({ where: { tenantId } });
        const tier = req.user?.tier || 'STARTER';
        const limits: Record<string, number> = { STARTER: 2, PRO: 5, BUSINESS: 10 };
        const limit = limits[tier] || 2;

        if (currentCount >= limit) {
          return res.status(403).json({
            error: `Plan limit reached (${limit} profiles). Upgrade to add more.`
          });
        }

        const profile = await sessionManager.createProfile(tenantId, name, phoneNumber);
        console.log('Profile created:', profile.id);
        res.json(profile);
      } catch (e: any) {
        console.error('Error in POST /api/profiles:', e);
        res.status(500).json({ error: dev ? e.message : 'Failed to create profile' });
      }
    });

    server.get('/api/profiles', async (req: AuthenticatedRequest, res) => {
      try {
        let profiles: any[] = [];

        if (req.user && req.tenantId) {
          profiles = await sessionManager.listProfiles(req.tenantId);
        } else if (dev) {
          // Dev fallback
          profiles = await sessionManager.listProfiles('default-tenant');
        } else {
          return res.status(401).json({ error: 'Authentication required' });
        }

        res.json(profiles);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Failed to list profiles' });
      }
    });

    server.put('/api/profiles/:id', requireAuth, verifyProfileOwnership, validateBody(updateProfileSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { name } = req.body;
        const profile = await sessionManager.updateProfile(req.params.id, name);
        res.json(profile);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Failed to update profile' });
      }
    });

    server.delete('/api/profiles/:id', requireAuth, verifyProfileOwnership, async (req: AuthenticatedRequest, res) => {
      try {
        await sessionManager.deleteProfile(req.params.id);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Failed to delete profile' });
      }
    });

    // ============================================
    // API ROUTES: Interaction (Protected)
    // ============================================
    server.post('/api/profiles/:id/interact/click', requireAuth, verifyProfileOwnership, validateBody(interactClickSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { x, y } = req.body;
        const page = await browserManager.getPage(req.params.id);
        if (!page) return res.status(404).json({ error: 'Session not active' });

        await page.mouse.click(x, y);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Click failed' });
      }
    });

    server.post('/api/profiles/:id/interact/scroll', requireAuth, verifyProfileOwnership, validateBody(interactScrollSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { deltaY } = req.body;
        const page = await browserManager.getPage(req.params.id);
        if (!page) return res.status(404).json({ error: 'Session not active' });

        await page.mouse.wheel(0, deltaY);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Scroll failed' });
      }
    });

    // ============================================
    // API ROUTES: Scraping (Protected + Rate Limited)
    // ============================================
    server.post('/api/profiles/:id/scrape/chat-list', requireAuth, verifyProfileOwnership, scrapeLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const scraper = browserManager.getScraper(req.params.id);
        if (!scraper) return res.status(404).json({ error: 'Session not active' });

        await scraper.scrollChatList();
        res.json({ success: true, message: 'Scrolled chat list' });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Scrape failed' });
      }
    });

    server.post('/api/profiles/:id/scrape/messages', requireAuth, verifyProfileOwnership, scrapeLimiter, async (req: AuthenticatedRequest, res) => {
      try {
        const scraper = browserManager.getScraper(req.params.id);
        if (!scraper) return res.status(404).json({ error: 'Session not active' });

        const messages = await scraper.parseMessages();
        res.json({ success: true, count: messages.length, messages });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Scrape failed' });
      }
    });

    server.get('/api/profiles/:id/screenshot', requireAuth, verifyProfileOwnership, async (req: AuthenticatedRequest, res) => {
      try {
        const buffer = await browserManager.getScreenshot(req.params.id);
        if (!buffer) return res.status(404).send('Session not active');
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Screenshot failed' });
      }
    });

    // Debug selectors endpoint removed - not needed in production

    // ============================================
    // API ROUTES: Search (Protected)
    // ============================================
    server.get('/api/search', requireAuth, validateQuery(advancedSearchSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const tenantId = req.tenantId;
        if (!tenantId && !dev) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Parse query parameters
        const {
          q,
          profileId,
          chatId,
          fromMe,
          dateFrom,
          dateTo,
          hasMedia,
          mediaType,
          sortBy,
          sortOrder,
          page,
          limit
        } = req.query as {
          q?: string;
          profileId?: string;
          chatId?: string;
          fromMe?: string;
          dateFrom?: string;
          dateTo?: string;
          hasMedia?: string;
          mediaType?: string;
          sortBy?: string;
          sortOrder?: string;
          page?: string;
          limit?: string;
        };

        const pageNum = parseInt(page || '1', 10);
        const limitNum = Math.min(parseInt(limit || '50', 10), 100); // Max 100
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const whereClause: any = {};

        // Text search
        if (q && q.trim()) {
          whereClause.body = { contains: q.trim() };
        }

        // Tenant filter
        if (tenantId) {
          whereClause.chat = {
            profile: { tenantId }
          };
        }

        // Profile filter
        if (profileId) {
          whereClause.chat = {
            ...whereClause.chat,
            profileId
          };
        }

        // Chat filter
        if (chatId) {
          whereClause.chatId = chatId;
        }

        // Sender filter
        if (fromMe === 'true') {
          whereClause.fromMe = true;
        } else if (fromMe === 'false') {
          whereClause.fromMe = false;
        }

        // Date range filter
        if (dateFrom || dateTo) {
          whereClause.timestamp = {};
          if (dateFrom) {
            whereClause.timestamp.gte = new Date(dateFrom);
          }
          if (dateTo) {
            // Add 1 day to include the entire end date
            const endDate = new Date(dateTo);
            endDate.setDate(endDate.getDate() + 1);
            whereClause.timestamp.lte = endDate;
          }
        }

        // Media filter
        if (hasMedia === 'true') {
          whereClause.mediaUrl = { not: null };
        } else if (hasMedia === 'false') {
          whereClause.mediaUrl = null;
        }

        // Media type filter
        if (mediaType && mediaType !== 'all') {
          whereClause.mediaType = mediaType;
        }

        // Count total results for pagination
        const totalCount = await prisma.message.count({ where: whereClause });

        // Fetch messages
        const messages = await prisma.message.findMany({
          where: whereClause,
          include: {
            chat: {
              include: { profile: { select: { id: true, name: true } } }
            }
          },
          orderBy: { [sortBy || 'timestamp']: sortOrder || 'desc' },
          skip,
          take: limitNum
        });

        const results = messages.map(m => ({
          id: m.id,
          body: m.body,
          timestamp: m.timestamp,
          fromMe: m.fromMe,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          chatId: m.chatId,
          chatName: m.chat.name || m.chat.remoteJid,
          profileName: m.chat.profile.name,
          profileId: m.chat.profileId
        }));

        res.json({
          results,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum)
          },
          filters: {
            q,
            profileId,
            chatId,
            fromMe,
            dateFrom,
            dateTo,
            hasMedia,
            mediaType
          }
        });
      } catch (e: any) {
        console.error('Search error:', e);
        res.status(500).json({ error: dev ? e.message : 'Search failed' });
      }
    });

    // ============================================
    // API ROUTES: Analytics (Protected)
    // ============================================
    server.get('/api/analytics/summary', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const tenantId = req.tenantId;
        if (!tenantId && !dev) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const effectiveTenantId = tenantId || 'default-tenant';

        const totalMessages = await prisma.message.count({
          where: {
            chat: {
              profile: { tenantId: effectiveTenantId }
            }
          }
        });

        const totalChats = await prisma.chat.count({
          where: {
            profile: { tenantId: effectiveTenantId }
          }
        });

        const activePhones = await prisma.profile.count({
          where: { tenantId: effectiveTenantId, isActive: true }
        });

        const profiles = await prisma.profile.findMany({
          where: { tenantId: effectiveTenantId },
          include: {
            _count: { select: { chats: true } }
          }
        });

        const messagesByProfile = await Promise.all(profiles.map(async p => {
          const count = await prisma.message.count({
            where: { chat: { profileId: p.id } }
          });
          return { name: p.name, count };
        }));

        // Activity Last 7 Days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const rawMessages = await prisma.message.findMany({
          where: {
            timestamp: { gte: sevenDaysAgo },
            chat: {
              profile: { tenantId: effectiveTenantId }
            }
          },
          select: { timestamp: true }
        });

        const activityMap = new Map<string, number>();
        rawMessages.forEach(m => {
          const date = m.timestamp.toISOString().split('T')[0];
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        const activityLast7Days = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

        res.json({
          totalMessages,
          totalChats,
          activePhones,
          messagesByProfile,
          activityLast7Days
        });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Analytics failed' });
      }
    });

    // ============================================
    // API ROUTES: Authentication (Rate Limited)
    // ============================================
    server.post('/api/register', authLimiter, validateBody(registerSchema), async (req, res) => {
      try {
        const { name, email, password, tier } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds

        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            tier: tier || 'STARTER'
          }
        });

        // Create Tenant
        await prisma.tenant.create({
          data: {
            name: `${name || 'User'}'s Organization`,
            userId: user.id
          }
        });

        res.json({ success: true, userId: user.id });
      } catch (e: any) {
        console.error('Registration error:', e);
        res.status(500).json({ error: dev ? e.message : 'Registration failed' });
      }
    });

    // ============================================
    // API ROUTES: Subscription (Protected)
    // ============================================
    server.post('/api/subscription/update', requireAuth, validateBody(subscriptionSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { tier } = req.body;

        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await prisma.user.update({
          where: { id: req.user.id },
          data: { tier }
        });

        res.json({ success: true, tier });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Update failed' });
      }
    });

    // ============================================
    // API ROUTES: Settings (Protected)
    // ============================================
    server.get('/api/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          include: { tenant: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
          companyName: user.tenant?.companyName || 'My Users',
          logoUrl: user.tenant?.logoUrl || null,
          language: user.language || 'en',
          tier: user.tier
        });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Settings fetch failed' });
      }
    });

    server.post('/api/settings', requireAuth, validateBody(settingsSchema), async (req: AuthenticatedRequest, res) => {
      try {
        const { companyName, language } = req.body;
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        if (language) {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { language }
          });
        }

        if (companyName) {
          await prisma.tenant.update({
            where: { userId: req.user.id },
            data: { companyName }
          });
        }

        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Settings update failed' });
      }
    });

    // ============================================
    // API ROUTES: Static Files
    // ============================================
    server.use('/uploads', express.static('public/uploads'));

    // ============================================
    // API ROUTES: Full Scrape (Protected + Rate Limited)
    // ============================================
    // ============================================
    // BULLETPROOF BACKUP: New IndexedDB-based endpoint
    // ============================================
    server.post('/api/profiles/:id/scrape', requireAuth, verifyProfileOwnership, scrapeLimiter, async (req: AuthenticatedRequest, res) => {
      const profileId = req.params.id;

      try {
        console.log(`[Backup] Starting backup for profile ${profileId}`);

        // Use the new bulletproof backup method
        const result = await sessionManager.backupAllMessages(profileId, (progress) => {
          // Emit progress via Socket.IO
          io.to(profileId).emit('backup-progress', {
            profileId,
            phase: progress.phase,
            current: progress.current,
            total: progress.total,
            message: progress.message
          });
        });

        if (result.success) {
          // Emit completion event
          io.to(profileId).emit('backup-complete', {
            profileId,
            stats: result.stats
          });

          res.json({
            success: true,
            message: 'Backup completed successfully',
            stats: result.stats
          });
        } else {
          io.to(profileId).emit('backup-error', {
            profileId,
            error: result.error
          });

          res.status(500).json({
            success: false,
            error: result.error,
            stats: result.stats
          });
        }
      } catch (e: any) {
        console.error('Backup failed:', e);
        io.to(profileId).emit('backup-error', {
          profileId,
          error: e.message
        });
        res.status(500).json({ error: dev ? e.message : 'Backup failed' });
      }
    });

    // Legacy scrape endpoint (for backwards compatibility with old DOM scraping)
    server.post('/api/profiles/:id/scrape-legacy', requireAuth, verifyProfileOwnership, scrapeLimiter, async (req: AuthenticatedRequest, res) => {
      const profileId = req.params.id;
      const page = await browserManager.getPage(profileId);
      if (!page) return res.status(404).json({ error: 'Session not active' });

      try {
        const scraper = new Scraper(page);

        const results = await scraper.scrapeAllChats(async (current: number, total: number, chatName: string) => {
          io.emit('scrape-progress', { profileId, current, total, chatName });
        });

        let totalSaved = 0;
        for (const result of results) {
          const saveResult = await sessionManager.saveScrapedData(profileId, result.chatName, result.messages);
          totalSaved += saveResult.savedCount;
        }

        res.json({ success: true, count: totalSaved, chatsScraped: results.length });
      } catch (e: any) {
        console.error('Legacy scrape failed', e);
        res.status(500).json({ error: dev ? e.message : 'Scrape failed' });
      }
    });

    // Backup status endpoint
    server.get('/api/profiles/:id/backup-status', requireAuth, verifyProfileOwnership, async (req: AuthenticatedRequest, res) => {
      try {
        const status = await sessionManager.getBackupStatus(req.params.id);
        res.json(status);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Failed to get backup status' });
      }
    });

    // ============================================
    // API ROUTES: Chat History (Protected)
    // ============================================
    server.get('/api/profiles/:id/history', requireAuth, verifyProfileOwnership, async (req: AuthenticatedRequest, res) => {
      try {
        const chats = await prisma.chat.findMany({
          where: { profileId: req.params.id },
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { messages: true } }
          }
        });
        res.json(chats);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'History fetch failed' });
      }
    });

    server.get('/api/chats/:chatId/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        // Verify chat belongs to user's tenant
        const chat = await prisma.chat.findUnique({
          where: { id: req.params.chatId },
          include: { profile: true }
        });

        if (!chat) {
          return res.status(404).json({ error: 'Chat not found' });
        }

        if (req.tenantId && chat.profile.tenantId !== req.tenantId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const messages = await prisma.message.findMany({
          where: { chatId: req.params.chatId },
          orderBy: { timestamp: 'asc' }
        });
        res.json(messages);
      } catch (e: any) {
        res.status(500).json({ error: dev ? e.message : 'Messages fetch failed' });
      }
    });

    // ============================================
    // API ROUTES: Health Check (Public)
    // ============================================
    server.get('/api/health', async (_req, res) => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        checks: {
          database: false,
          browser: false
        }
      };

      try {
        await prisma.$queryRaw`SELECT 1`;
        health.checks.database = true;
      } catch (e) {
        health.status = 'degraded';
      }

      try {
        const browserHealth = browserManager.getHealthStatus?.() || { healthy: true };
        health.checks.browser = browserHealth.healthy;
      } catch (e) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // ============================================
    // GLOBAL ERROR HANDLER
    // ============================================
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    server.use((err: any, req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);

      // Don't expose internal errors in production
      const message = dev ? err.message : 'Internal server error';
      const status = err.status || 500;

      res.status(status).json({
        error: message,
        requestId: req.requestId
      });
    });

    // ============================================
    // NEXT.JS HANDLER
    // ============================================
    server.all(/(.*)/, (req, res) => {
      return handle(req, res);
    });

    // ============================================
    // INITIALIZE ENCRYPTION
    // ============================================
    const encryptionEnabled = await initializeEncryption();
    if (encryptionEnabled) {
      console.log('> Session encryption: ENABLED');
    } else {
      console.log('> Session encryption: DISABLED (set ENCRYPTION_KEY to enable)');
    }

    // ============================================
    // START SERVER
    // ============================================
    httpServer.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
      console.log(`> Environment: ${process.env.NODE_ENV}`);
      console.log(`> CORS origins: ${allowedOrigins.join(', ')}`);
      console.log(`> Encryption: ${encryptionService.isEnabled() ? 'enabled' : 'disabled'}`);
    });

    // ============================================
    // GRACEFUL SHUTDOWN
    // ============================================
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, starting graceful shutdown...`);

      const shutdownTimeout = setTimeout(() => {
        console.error('Shutdown timeout, forcing exit');
        process.exit(1);
      }, 30000);

      try {
        // Stop accepting new connections
        httpServer.close();

        // Close all socket connections
        io.close();

        // Close all browser contexts
        console.log('Closing browser sessions...');
        await browserManager.closeAll();

        // Close database connection
        console.log('Closing database connection...');
        await prisma.$disconnect();

        clearTimeout(shutdownTimeout);
        console.log('Graceful shutdown complete');
        process.exit(0);
      } catch (e) {
        console.error('Error during shutdown:', e);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (e) {
    console.error('Server startup failed:', e);
    process.exit(1);
  }
})();
