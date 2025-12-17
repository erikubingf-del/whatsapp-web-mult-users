import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, service, profileId, ...meta }) => {
        let log = `${timestamp} [${level}]`;
        if (service) log += ` [${service}]`;
        if (profileId) log += ` [${profileId}]`;
        log += ` ${message}`;

        // Add metadata if present
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0 && metaKeys.some(k => k !== 'splat')) {
            const filteredMeta = Object.fromEntries(
                Object.entries(meta).filter(([k]) => k !== 'splat')
            );
            if (Object.keys(filteredMeta).length > 0) {
                log += ` ${JSON.stringify(filteredMeta)}`;
            }
        }

        return log;
    })
);

// JSON format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the main logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'whatsapp-multi' },
    transports: [
        // Console transport - always enabled
        new winston.transports.Console({
            format: consoleFormat,
        }),

        // File transport - combined logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),

        // File transport - error logs only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
    ],
});

// Create child loggers for different services
export const createServiceLogger = (service: string) => {
    return logger.child({ service });
};

// Pre-configured service loggers
export const browserLogger = createServiceLogger('browser');
export const sessionLogger = createServiceLogger('session');
export const scraperLogger = createServiceLogger('scraper');
export const apiLogger = createServiceLogger('api');
export const authLogger = createServiceLogger('auth');
export const backupLogger = createServiceLogger('backup');

// Helper function to log with profile context
export const logWithProfile = (
    baseLogger: winston.Logger,
    profileId: string
) => {
    return baseLogger.child({ profileId });
};

// Structured log helpers
export const logEvent = {
    // Session events
    sessionStart: (profileId: string, profileName: string) => {
        sessionLogger.info('Session started', { profileId, profileName, event: 'session_start' });
    },
    sessionConnect: (profileId: string) => {
        sessionLogger.info('WhatsApp connected', { profileId, event: 'session_connect' });
    },
    sessionDisconnect: (profileId: string) => {
        sessionLogger.warn('WhatsApp disconnected', { profileId, event: 'session_disconnect' });
    },
    sessionError: (profileId: string, error: Error | string) => {
        sessionLogger.error('Session error', {
            profileId,
            event: 'session_error',
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    },

    // Backup events
    backupStart: (profileId: string, type: 'auto' | 'manual') => {
        backupLogger.info('Backup started', { profileId, type, event: 'backup_start' });
    },
    backupProgress: (profileId: string, phase: string, current: number, total: number) => {
        backupLogger.debug('Backup progress', { profileId, phase, current, total, event: 'backup_progress' });
    },
    backupComplete: (profileId: string, stats: Record<string, number>) => {
        backupLogger.info('Backup completed', { profileId, ...stats, event: 'backup_complete' });
    },
    backupError: (profileId: string, error: Error | string) => {
        backupLogger.error('Backup failed', {
            profileId,
            event: 'backup_error',
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    },

    // Browser events
    browserLaunch: () => {
        browserLogger.info('Browser launched', { event: 'browser_launch' });
    },
    browserCrash: (profileId: string, error?: Error | string) => {
        browserLogger.error('Browser crashed', {
            profileId,
            event: 'browser_crash',
            error: error instanceof Error ? error.message : error
        });
    },
    browserRecover: (profileId: string, success: boolean) => {
        browserLogger.info('Browser recovery attempted', { profileId, success, event: 'browser_recover' });
    },

    // API events
    apiRequest: (method: string, path: string, userId?: string) => {
        apiLogger.debug('API request', { method, path, userId, event: 'api_request' });
    },
    apiError: (method: string, path: string, error: Error | string, statusCode?: number) => {
        apiLogger.error('API error', {
            method,
            path,
            statusCode,
            event: 'api_error',
            error: error instanceof Error ? error.message : error
        });
    },

    // Auth events
    loginSuccess: (userId: string, email: string) => {
        authLogger.info('Login successful', { userId, email, event: 'login_success' });
    },
    loginFailed: (email: string, reason: string) => {
        authLogger.warn('Login failed', { email, reason, event: 'login_failed' });
    },
    logout: (userId: string) => {
        authLogger.info('User logged out', { userId, event: 'logout' });
    },
};

// Export the base logger
export default logger;
