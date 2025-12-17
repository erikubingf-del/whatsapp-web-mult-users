import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Audit action categories
export type AuditCategory =
    | 'auth'
    | 'profile'
    | 'backup'
    | 'session'
    | 'settings'
    | 'admin'
    | 'api'
    | 'security';

// Predefined audit actions
export const AuditActions = {
    // Auth
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILURE: 'auth.login.failure',
    LOGOUT: 'auth.logout',
    REGISTER: 'auth.register',
    PASSWORD_CHANGE: 'auth.password.change',
    TWO_FACTOR_ENABLE: 'auth.2fa.enable',
    TWO_FACTOR_DISABLE: 'auth.2fa.disable',
    TWO_FACTOR_VERIFY: 'auth.2fa.verify',

    // Profile
    PROFILE_CREATE: 'profile.create',
    PROFILE_UPDATE: 'profile.update',
    PROFILE_DELETE: 'profile.delete',
    PROFILE_ACTIVATE: 'profile.activate',
    PROFILE_DEACTIVATE: 'profile.deactivate',

    // Session (WhatsApp)
    SESSION_START: 'session.start',
    SESSION_STOP: 'session.stop',
    SESSION_CONNECT: 'session.connect',
    SESSION_DISCONNECT: 'session.disconnect',
    SESSION_ERROR: 'session.error',

    // Backup
    BACKUP_START: 'backup.start',
    BACKUP_COMPLETE: 'backup.complete',
    BACKUP_FAILURE: 'backup.failure',
    BACKUP_EXPORT: 'backup.export',

    // Settings
    SETTINGS_UPDATE: 'settings.update',
    SUBSCRIPTION_CHANGE: 'subscription.change',
    LANGUAGE_CHANGE: 'settings.language.change',

    // Admin
    ADMIN_USER_CREATE: 'admin.user.create',
    ADMIN_USER_DELETE: 'admin.user.delete',
    ADMIN_USER_UPDATE: 'admin.user.update',
    ADMIN_TENANT_CREATE: 'admin.tenant.create',

    // Security
    SECURITY_RATE_LIMIT: 'security.rate_limit',
    SECURITY_INVALID_TOKEN: 'security.invalid_token',
    SECURITY_UNAUTHORIZED: 'security.unauthorized',
    SECURITY_SUSPICIOUS: 'security.suspicious',

    // API
    API_REQUEST: 'api.request',
    API_ERROR: 'api.error',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// Audit log entry input
export interface AuditLogInput {
    userId?: string;
    userEmail?: string;
    tenantId?: string;
    action: string;
    category: AuditCategory;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
}

// Audit log query options
export interface AuditLogQuery {
    userId?: string;
    tenantId?: string;
    action?: string;
    category?: AuditCategory;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
}

/**
 * Audit Logging Service
 * Records all important user actions for security and compliance
 */
export class AuditService {
    private enabled: boolean = true;
    private batchQueue: AuditLogInput[] = [];
    private batchTimeout: NodeJS.Timeout | null = null;
    private batchSize: number = 10;
    private batchDelay: number = 1000; // ms

    /**
     * Log an audit event immediately
     */
    async log(input: AuditLogInput): Promise<void> {
        if (!this.enabled) return;

        try {
            await prisma.auditLog.create({
                data: {
                    userId: input.userId,
                    userEmail: input.userEmail,
                    tenantId: input.tenantId,
                    action: input.action,
                    category: input.category,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    details: input.details ? JSON.stringify(input.details) : null,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                    success: input.success ?? true,
                    errorMessage: input.errorMessage,
                },
            });
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Don't throw - audit logging should not break the application
        }
    }

    /**
     * Queue an audit event for batch writing (for high-volume events)
     */
    queueLog(input: AuditLogInput): void {
        if (!this.enabled) return;

        this.batchQueue.push(input);

        // Flush if batch size reached
        if (this.batchQueue.length >= this.batchSize) {
            this.flush();
            return;
        }

        // Schedule flush if not already scheduled
        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => this.flush(), this.batchDelay);
        }
    }

    /**
     * Flush queued audit logs to database
     */
    async flush(): Promise<void> {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        if (this.batchQueue.length === 0) return;

        const logs = [...this.batchQueue];
        this.batchQueue = [];

        try {
            await prisma.auditLog.createMany({
                data: logs.map(input => ({
                    userId: input.userId,
                    userEmail: input.userEmail,
                    tenantId: input.tenantId,
                    action: input.action,
                    category: input.category,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    details: input.details ? JSON.stringify(input.details) : null,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                    success: input.success ?? true,
                    errorMessage: input.errorMessage,
                })),
            });
        } catch (error) {
            console.error('Failed to flush audit logs:', error);
        }
    }

    /**
     * Query audit logs
     */
    async query(options: AuditLogQuery = {}): Promise<{
        logs: Array<{
            id: string;
            timestamp: Date;
            userId: string | null;
            userEmail: string | null;
            tenantId: string | null;
            action: string;
            category: string;
            targetType: string | null;
            targetId: string | null;
            details: Record<string, unknown> | null;
            ipAddress: string | null;
            userAgent: string | null;
            success: boolean;
            errorMessage: string | null;
        }>;
        total: number;
    }> {
        const where: Record<string, unknown> = {};

        if (options.userId) where.userId = options.userId;
        if (options.tenantId) where.tenantId = options.tenantId;
        if (options.action) where.action = options.action;
        if (options.category) where.category = options.category;
        if (options.success !== undefined) where.success = options.success;

        if (options.startDate || options.endDate) {
            where.timestamp = {};
            if (options.startDate) (where.timestamp as Record<string, Date>).gte = options.startDate;
            if (options.endDate) (where.timestamp as Record<string, Date>).lte = options.endDate;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: options.limit || 50,
                skip: options.offset || 0,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return {
            logs: logs.map(log => ({
                ...log,
                details: log.details ? JSON.parse(log.details) : null,
            })),
            total,
        };
    }

    /**
     * Get audit log statistics
     */
    async getStats(tenantId?: string, days: number = 30): Promise<{
        totalEvents: number;
        successRate: number;
        byCategory: Record<string, number>;
        byAction: Record<string, number>;
        recentFailures: number;
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const where: Record<string, unknown> = {
            timestamp: { gte: since },
        };
        if (tenantId) where.tenantId = tenantId;

        const [total, successful, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.count({ where: { ...where, success: true } }),
            prisma.auditLog.findMany({
                where,
                select: { category: true, action: true, success: true },
            }),
        ]);

        const byCategory: Record<string, number> = {};
        const byAction: Record<string, number> = {};
        let recentFailures = 0;

        for (const log of logs) {
            byCategory[log.category] = (byCategory[log.category] || 0) + 1;
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            if (!log.success) recentFailures++;
        }

        return {
            totalEvents: total,
            successRate: total > 0 ? (successful / total) * 100 : 100,
            byCategory,
            byAction,
            recentFailures,
        };
    }

    /**
     * Clean up old audit logs (retention policy)
     */
    async cleanup(retentionDays: number = 90): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        const result = await prisma.auditLog.deleteMany({
            where: {
                timestamp: { lt: cutoff },
            },
        });

        console.log(`Cleaned up ${result.count} old audit logs`);
        return result.count;
    }

    /**
     * Enable/disable audit logging
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if audit logging is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

// Singleton instance
export const auditService = new AuditService();

// Convenience logging functions
export function auditAuth(
    action: string,
    userEmail: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
): void {
    auditService.log({
        action,
        category: 'auth',
        userEmail,
        success,
        ipAddress,
        userAgent,
        errorMessage,
    });
}

export function auditProfile(
    action: string,
    userId: string,
    tenantId: string,
    profileId: string,
    details?: Record<string, unknown>
): void {
    auditService.log({
        action,
        category: 'profile',
        userId,
        tenantId,
        targetType: 'profile',
        targetId: profileId,
        details,
    });
}

export function auditBackup(
    action: string,
    userId: string,
    tenantId: string,
    profileId: string,
    success: boolean,
    details?: Record<string, unknown>
): void {
    auditService.log({
        action,
        category: 'backup',
        userId,
        tenantId,
        targetType: 'profile',
        targetId: profileId,
        success,
        details,
    });
}

export function auditSecurity(
    action: string,
    ipAddress: string,
    userAgent?: string,
    details?: Record<string, unknown>
): void {
    auditService.log({
        action,
        category: 'security',
        ipAddress,
        userAgent,
        success: false,
        details,
    });
}
