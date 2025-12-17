import { PrismaClient } from '@prisma/client';
import { browserManager } from './browser';
import { getSessionPath } from './session';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';
import { sessionLogger, backupLogger, logEvent } from '../logger';
import { MediaDownloader, getMediaStorageSize } from '../services/media';

// Session state file path
const SESSION_STATE_FILE = path.join(process.cwd(), '.sessions', 'active_sessions.json');

// Session state interface
interface SessionState {
    profileId: string;
    profileName: string;
    status: 'connected' | 'disconnected' | 'connecting';
    lastActive: string;
}

interface SessionStateFile {
    version: number;
    savedAt: string;
    sessions: SessionState[];
}

const prisma = new PrismaClient();

// Progress callback type for backup operations
export interface BackupProgress {
    phase: 'extracting' | 'saving_chats' | 'saving_messages' | 'complete' | 'error';
    current: number;
    total: number;
    message?: string;
}

// Backup result type
export interface BackupResult {
    success: boolean;
    stats: {
        chatsFound: number;
        chatsSaved: number;
        messagesFound: number;
        messagesSaved: number;
        newMessages: number;
        duplicatesSkipped: number;
        mediaFound: number;
        mediaDownloaded: number;
        mediaFailed: number;
        extractionTime: number;
        totalTime: number;
    };
    error?: string;
}

export class SessionManager {
    private autoBackupEnabled: boolean = true;

    constructor() {
        // Register callback for auto-backup when sessions become ready
        this.setupAutoBackupCallback();
    }

    /**
     * Sets up the auto-backup callback with the browser manager
     * This triggers backup when WhatsApp becomes connected
     */
    private setupAutoBackupCallback() {
        browserManager.setSessionReadyCallback(async (profileId, status) => {
            if (status === 'connected' && this.autoBackupEnabled) {
                backupLogger.info('Auto-backup starting', { profileId });

                try {
                    // Small delay to ensure WhatsApp is fully loaded
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    const result = await this.backupAllMessages(profileId, (progress) => {
                        logEvent.backupProgress(profileId, progress.phase, progress.current, progress.total);
                    });

                    if (result.success) {
                        logEvent.backupComplete(profileId, result.stats);
                    } else {
                        logEvent.backupError(profileId, result.error || 'Unknown error');
                    }
                } catch (error) {
                    logEvent.backupError(profileId, error as Error);
                }
            } else if (status === 'disconnected') {
                sessionLogger.info('Session disconnected', { profileId });
            }
        });
    }

    /**
     * Enable or disable auto-backup on session connect
     */
    setAutoBackupEnabled(enabled: boolean) {
        this.autoBackupEnabled = enabled;
        backupLogger.info(`Auto-backup ${enabled ? 'enabled' : 'disabled'}`);
    }

    // ============================================
    // SESSION STATE PERSISTENCE
    // ============================================

    /**
     * Save current active session state to disk
     * Called periodically and on shutdown
     */
    async saveSessionState(): Promise<void> {
        try {
            const profiles = await prisma.profile.findMany({
                where: { isActive: true }
            });

            const sessions: SessionState[] = [];

            for (const profile of profiles) {
                const status = await browserManager.getStatus(profile.id);
                sessions.push({
                    profileId: profile.id,
                    profileName: profile.name,
                    status,
                    lastActive: new Date().toISOString()
                });
            }

            const stateFile: SessionStateFile = {
                version: 1,
                savedAt: new Date().toISOString(),
                sessions
            };

            // Ensure directory exists
            const stateDir = path.dirname(SESSION_STATE_FILE);
            await fs.mkdir(stateDir, { recursive: true });

            // Write state file
            await fs.writeFile(SESSION_STATE_FILE, JSON.stringify(stateFile, null, 2));
            sessionLogger.debug('Session state saved', { sessionCount: sessions.length });

        } catch (error) {
            sessionLogger.error('Failed to save session state', { error });
        }
    }

    /**
     * Load and restore session state from disk
     * Called on server startup
     */
    async restoreSessionState(): Promise<{
        restored: number;
        failed: number;
        skipped: number;
    }> {
        const results = { restored: 0, failed: 0, skipped: 0 };

        try {
            // Check if state file exists
            const exists = await fs.stat(SESSION_STATE_FILE).then(() => true).catch(() => false);
            if (!exists) {
                sessionLogger.info('No session state file found - starting fresh');
                return results;
            }

            const content = await fs.readFile(SESSION_STATE_FILE, 'utf-8');
            const stateFile: SessionStateFile = JSON.parse(content);

            sessionLogger.info('Restoring session state', {
                savedAt: stateFile.savedAt,
                sessionCount: stateFile.sessions.length
            });

            for (const session of stateFile.sessions) {
                try {
                    // Verify profile still exists and is active
                    const profile = await prisma.profile.findUnique({
                        where: { id: session.profileId }
                    });

                    if (!profile || !profile.isActive) {
                        sessionLogger.debug('Skipping inactive/deleted profile', { profileId: session.profileId });
                        results.skipped++;
                        continue;
                    }

                    // Initialize the session
                    await browserManager.initSession(profile.id, profile.name);
                    results.restored++;

                    sessionLogger.info('Session restored', {
                        profileId: profile.id,
                        profileName: profile.name
                    });

                } catch (error) {
                    sessionLogger.error('Failed to restore session', {
                        profileId: session.profileId,
                        error
                    });
                    results.failed++;
                }
            }

            sessionLogger.info('Session state restoration complete', results);

        } catch (error) {
            sessionLogger.error('Failed to load session state file', { error });
        }

        return results;
    }

    /**
     * Clear the session state file
     */
    async clearSessionState(): Promise<void> {
        try {
            await fs.unlink(SESSION_STATE_FILE);
            sessionLogger.info('Session state file cleared');
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }

    /**
     * Start periodic session state saving
     * @param intervalMs Save interval in milliseconds (default: 60 seconds)
     */
    startPeriodicStateSave(intervalMs: number = 60000): NodeJS.Timeout {
        sessionLogger.info('Starting periodic session state save', { intervalMs });

        const interval = setInterval(async () => {
            await this.saveSessionState();
        }, intervalMs);

        // Save immediately on start
        this.saveSessionState();

        return interval;
    }

    /**
     * Get a profile name by ID (helper for browser recovery)
     */
    async getProfileName(profileId: string): Promise<string | null> {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { name: true }
        });
        return profile?.name || null;
    }

    async createProfile(tenantId: string, name: string, phoneNumber?: string) {
        const profile = await prisma.profile.create({
            data: {
                tenantId,
                name,
                phoneNumber,
                sessionPath: '', // Will update after ID generation
            }
        });

        const sessionPath = getSessionPath(profile.id);

        await prisma.profile.update({
            where: { id: profile.id },
            data: { sessionPath }
        });

        // Initialize browser session (non-blocking - profile is returned even if browser fails)
        try {
            await browserManager.createContext({
                profileId: profile.id,
                sessionPath
            });

            // Start auto-save only if browser context was created successfully
            browserManager.startAutoSave(profile.id, sessionPath);
        } catch (browserError: any) {
            console.error(`Browser initialization failed for profile ${profile.id}:`, browserError.message);
            // Profile is still created - browser session can be retried when user selects it
        }

        return profile;
    }

    async updateProfile(profileId: string, name: string) {
        return prisma.profile.update({
            where: { id: profileId },
            data: { name }
        });
    }

    async listProfiles(tenantId: string) {
        const profiles = await prisma.profile.findMany({
            where: { tenantId }
        });

        const results = [];
        for (const p of profiles) {
            let status = 'disconnected';
            // Use browserManager to get status
            status = await browserManager.getStatus(p.id);

            results.push({
                ...p,
                status // 'connected' | 'disconnected' | 'connecting'
            });
        }

        return results;
    }

    async deleteProfile(profileId: string) {
        // Close browser session
        await browserManager.closeContext(profileId);

        // Delete session file
        const profile = await prisma.profile.findUnique({ where: { id: profileId } });
        if (profile?.sessionPath) {
            try {
                await fs.unlink(profile.sessionPath);
            } catch (e) {
                console.error(`Failed to delete session file for ${profileId}`, e);
            }
        }

        // Delete from DB
        return prisma.profile.delete({
            where: { id: profileId }
        });
    }

    async startAllSessions() {
        const profiles = await prisma.profile.findMany({
            where: { isActive: true }
        });

        for (const profile of profiles) {
            try {
                await browserManager.createContext({
                    profileId: profile.id,
                    sessionPath: profile.sessionPath
                });
                // Start auto-save
                browserManager.startAutoSave(profile.id, profile.sessionPath);
            } catch (e) {
                console.error(`Failed to start session for ${profile.id}`, e);
            }
        }
    }

    async saveScrapedData(profileId: string, chatName: string, messages: any[]) {
        // 1. Find or Create Chat
        const remoteJid = chatName.replace(/\D/g, '') || chatName;

        const chat = await prisma.chat.upsert({
            where: {
                profileId_remoteJid: {
                    profileId,
                    remoteJid
                }
            },
            update: {
                name: chatName,
                updatedAt: new Date()
            },
            create: {
                profileId,
                remoteJid,
                name: chatName
            }
        });

        // 2. Upsert Messages
        let savedCount = 0;
        const path = require('path');
        const fs = require('fs/promises');

        for (const msg of messages) {
            // Handle Media Saving
            let savedMediaUrl = null;
            if (msg.mediaUrl && msg.mediaType === 'image') {
                try {
                    // Expecting base64 data: "data:image/jpeg;base64,..."
                    const matches = msg.mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const ext = matches[1].split('/')[1] || 'png';
                        const buffer = Buffer.from(matches[2], 'base64');
                        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

                        await fs.writeFile(filepath, buffer);
                        savedMediaUrl = `/uploads/${filename}`;
                    }
                } catch (e) {
                    console.error('Failed to save media', e);
                }
            }

            // Create a hash to prevent duplicates
            const crypto = require('crypto');
            const hashInput = `${msg.timestamp}-${remoteJid}-${msg.body}-${savedMediaUrl || ''}`;
            const messageHash = crypto.createHash('sha256').update(hashInput).digest('hex');

            const timestamp = new Date(); // Placeholder

            try {
                await prisma.message.upsert({
                    where: { messageHash },
                    update: {},
                    create: {
                        chatId: chat.id,
                        remoteJid,
                        fromMe: msg.sender === 'Me',
                        body: msg.body,
                        timestamp: timestamp,
                        mediaUrl: savedMediaUrl,
                        mediaType: msg.mediaType,
                        messageHash
                    }
                });
                savedCount++;
            } catch (e) {
                // Ignore duplicate errors
            }
        }

        // Update last scraped time
        await prisma.profile.update({
            where: { id: profileId },
            data: { lastScraped: new Date() }
        });

        return { chatId: chat.id, savedCount };
    }

    // ============================================
    // BULLETPROOF BACKUP: IndexedDB-based backup
    // ============================================

    /**
     * Backup all messages using IndexedDB extraction (10x faster than DOM scraping)
     * @param profileId - The profile to backup
     * @param onProgress - Optional callback for progress updates
     */
    async backupAllMessages(
        profileId: string,
        onProgress?: (progress: BackupProgress) => void
    ): Promise<BackupResult> {
        const startTime = Date.now();
        const stats = {
            chatsFound: 0,
            chatsSaved: 0,
            messagesFound: 0,
            messagesSaved: 0,
            newMessages: 0,
            duplicatesSkipped: 0,
            mediaFound: 0,
            mediaDownloaded: 0,
            mediaFailed: 0,
            extractionTime: 0,
            totalTime: 0
        };

        try {
            // Get the scraper for this profile
            const scraper = browserManager.getScraper(profileId);
            if (!scraper) {
                return {
                    success: false,
                    stats,
                    error: 'Session not active - please open WhatsApp first'
                };
            }

            // Phase 1: Extract data from IndexedDB
            onProgress?.({ phase: 'extracting', current: 0, total: 100, message: 'Extracting data from WhatsApp...' });

            const extractedData = await scraper.extractAllDataWithFallback();
            stats.extractionTime = extractedData.extractionTime;
            stats.chatsFound = extractedData.chats.length;
            stats.messagesFound = extractedData.messages.length;

            if (!extractedData.success && extractedData.chats.length === 0) {
                return {
                    success: false,
                    stats,
                    error: extractedData.error || 'Failed to extract data from WhatsApp'
                };
            }

            onProgress?.({ phase: 'extracting', current: 100, total: 100, message: `Found ${stats.chatsFound} chats and ${stats.messagesFound} messages` });

            // Phase 1.5: Download media for messages that have it
            const messagesWithMedia = extractedData.messages.filter(m => m.hasMedia && (m.mediaUrl || m.directPath));
            stats.mediaFound = messagesWithMedia.length;

            const mediaPathMap = new Map<string, string>(); // messageId -> local path

            if (messagesWithMedia.length > 0) {
                onProgress?.({ phase: 'extracting', current: 0, total: stats.mediaFound, message: `Downloading ${stats.mediaFound} media files...` });

                const page = await browserManager.getPage(profileId);
                if (page) {
                    const mediaDownloader = new MediaDownloader(page, profileId);

                    // Download media in batches
                    const downloadedPaths = await mediaDownloader.downloadMediaBatch(
                        messagesWithMedia.map(m => ({
                            id: m.id,
                            hasMedia: m.hasMedia,
                            mediaUrl: m.mediaUrl,
                            directPath: m.directPath,
                            mediaKey: m.mediaKey,
                            mimetype: m.mediaType
                        })),
                        3 // Max concurrent downloads
                    );

                    // Update stats and map
                    for (const [msgId, localPath] of downloadedPaths) {
                        mediaPathMap.set(msgId, localPath);
                        stats.mediaDownloaded++;
                    }
                    stats.mediaFailed = stats.mediaFound - stats.mediaDownloaded;

                    backupLogger.info('Media download complete', {
                        profileId,
                        found: stats.mediaFound,
                        downloaded: stats.mediaDownloaded,
                        failed: stats.mediaFailed
                    });
                }
            }

            // Phase 2: Save Chats
            onProgress?.({ phase: 'saving_chats', current: 0, total: stats.chatsFound, message: 'Saving chats...' });

            const chatIdMap = new Map<string, string>(); // WhatsApp ID -> DB ID

            for (let i = 0; i < extractedData.chats.length; i++) {
                const chat = extractedData.chats[i];
                if (!chat.id) continue;

                try {
                    const dbChat = await prisma.chat.upsert({
                        where: {
                            profileId_remoteJid: {
                                profileId,
                                remoteJid: chat.id
                            }
                        },
                        update: {
                            name: chat.name || chat.id.split('@')[0] || 'Unknown',
                            updatedAt: new Date()
                        },
                        create: {
                            profileId,
                            remoteJid: chat.id,
                            name: chat.name || chat.id.split('@')[0] || 'Unknown'
                        }
                    });

                    chatIdMap.set(chat.id, dbChat.id);
                    stats.chatsSaved++;
                } catch (e: any) {
                    console.error(`Failed to save chat ${chat.id}:`, e.message);
                }

                // Update progress every 10 chats
                if (i % 10 === 0 || i === extractedData.chats.length - 1) {
                    onProgress?.({ phase: 'saving_chats', current: i + 1, total: stats.chatsFound });
                }
            }

            // Phase 3: Save Messages in batches
            onProgress?.({ phase: 'saving_messages', current: 0, total: stats.messagesFound, message: 'Saving messages...' });

            const BATCH_SIZE = 50;
            let processed = 0;

            for (let i = 0; i < extractedData.messages.length; i += BATCH_SIZE) {
                const batch = extractedData.messages.slice(i, i + BATCH_SIZE);

                for (const msg of batch) {
                    if (!msg.chatId) continue;

                    // Get the DB chat ID
                    let dbChatId = chatIdMap.get(msg.chatId);

                    // If chat wasn't in our list, create it
                    if (!dbChatId) {
                        try {
                            const newChat = await prisma.chat.upsert({
                                where: {
                                    profileId_remoteJid: {
                                        profileId,
                                        remoteJid: msg.chatId
                                    }
                                },
                                update: {},
                                create: {
                                    profileId,
                                    remoteJid: msg.chatId,
                                    name: msg.chatId.split('@')[0] || 'Unknown'
                                }
                            });
                            dbChatId = newChat.id;
                            chatIdMap.set(msg.chatId, dbChatId);
                        } catch (e) {
                            continue; // Skip this message if we can't create the chat
                        }
                    }

                    // Generate unique hash for deduplication
                    const hashInput = `${msg.timestamp}|${msg.chatId}|${msg.body || ''}|${msg.fromMe}|${msg.id}`;
                    const messageHash = crypto.createHash('sha256').update(hashInput).digest('hex');

                    // Convert timestamp (WhatsApp uses seconds, we need Date)
                    const timestamp = msg.timestamp > 0
                        ? new Date(msg.timestamp * 1000)
                        : new Date();

                    try {
                        // Check if message already exists
                        const existingMessage = await prisma.message.findUnique({
                            where: { messageHash }
                        });

                        if (existingMessage) {
                            // Message already exists - skip
                            stats.duplicatesSkipped++;
                        } else {
                            // Check if we downloaded media for this message
                            const localMediaPath = mediaPathMap.get(msg.id);

                            // Create new message
                            await prisma.message.create({
                                data: {
                                    chatId: dbChatId,
                                    remoteJid: msg.chatId,
                                    body: msg.body || '',
                                    timestamp,
                                    fromMe: msg.fromMe || false,
                                    mediaUrl: localMediaPath || msg.mediaUrl || null,
                                    mediaType: msg.mediaType || null,
                                    messageHash,
                                    metadata: JSON.stringify({
                                        type: msg.type,
                                        hasMedia: msg.hasMedia,
                                        caption: msg.caption,
                                        author: msg.author,
                                        originalId: msg.id,
                                        quotedMsgId: msg.quotedMsgId,
                                        originalMediaUrl: msg.mediaUrl,
                                        directPath: msg.directPath,
                                        mediaDownloaded: !!localMediaPath
                                    })
                                }
                            });

                            stats.messagesSaved++;
                            stats.newMessages++;
                        }
                    } catch (e: any) {
                        // Duplicate or other error - count as skipped
                        if (e.code === 'P2002') { // Prisma unique constraint violation
                            stats.duplicatesSkipped++;
                        }
                    }

                    processed++;
                }

                // Update progress
                onProgress?.({
                    phase: 'saving_messages',
                    current: processed,
                    total: stats.messagesFound,
                    message: `Saved ${stats.messagesSaved} messages (${stats.duplicatesSkipped} duplicates skipped)`
                });
            }

            // Phase 4: Update profile
            await prisma.profile.update({
                where: { id: profileId },
                data: { lastScraped: new Date() }
            });

            stats.totalTime = Date.now() - startTime;

            onProgress?.({
                phase: 'complete',
                current: 100,
                total: 100,
                message: `Backup complete! ${stats.newMessages} new messages saved.`
            });

            console.log(`Backup completed for profile ${profileId}:`, stats);

            return { success: true, stats };

        } catch (error: any) {
            stats.totalTime = Date.now() - startTime;
            console.error(`Backup failed for profile ${profileId}:`, error);

            onProgress?.({
                phase: 'error',
                current: 0,
                total: 100,
                message: error.message || 'Backup failed'
            });

            return {
                success: false,
                stats,
                error: error.message || 'Unknown backup error'
            };
        }
    }

    /**
     * Quick backup status check for a profile
     */
    async getBackupStatus(profileId: string): Promise<{
        lastBackup: Date | null;
        totalChats: number;
        totalMessages: number;
    }> {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                _count: { select: { chats: true } }
            }
        });

        if (!profile) {
            return { lastBackup: null, totalChats: 0, totalMessages: 0 };
        }

        const totalMessages = await prisma.message.count({
            where: { chat: { profileId } }
        });

        return {
            lastBackup: profile.lastScraped,
            totalChats: profile._count.chats,
            totalMessages
        };
    }
}

export const sessionManager = new SessionManager();
