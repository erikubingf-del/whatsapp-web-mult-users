import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phoneNumber: z.string().optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long')
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  tier: z.enum(['STARTER', 'PRO', 'BUSINESS']).default('STARTER')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const settingsSchema = z.object({
  companyName: z.string().max(100, 'Company name too long').optional(),
  language: z.enum(['en', 'pt']).optional()
});

export const subscriptionSchema = z.object({
  tier: z.enum(['STARTER', 'PRO', 'BUSINESS'])
});

export const interactClickSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0)
});

export const interactScrollSchema = z.object({
  deltaY: z.number()
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(500, 'Query too long')
});

// Enhanced search with filters
export const advancedSearchSchema = z.object({
  q: z.string().max(500, 'Query too long').optional(),
  profileId: z.string().uuid().optional(),
  chatId: z.string().optional(),
  fromMe: z.enum(['true', 'false', 'all']).optional().default('all'),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(),   // ISO date string
  hasMedia: z.enum(['true', 'false', 'all']).optional().default('all'),
  mediaType: z.enum(['image', 'video', 'audio', 'document', 'all']).optional().default('all'),
  sortBy: z.enum(['timestamp', 'relevance']).optional().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50')
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Creates a validation middleware for request body
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(400).json({ error: 'Invalid request data' });
    }
  };
};

/**
 * Creates a validation middleware for query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
};

/**
 * Creates a validation middleware for URL parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((e: z.ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(400).json({ error: 'Invalid URL parameters' });
    }
  };
};

// UUID validation schema for profile IDs
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid profile ID format')
});

export const chatIdParamSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required')
});
