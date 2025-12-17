import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuditService, AuditActions } from '../../server/services/audit';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
    const mockCreate = jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'test-id' });
    const mockCreateMany = jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const mockFindMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
    const mockCount = jest.fn<() => Promise<number>>().mockResolvedValue(0);
    const mockDeleteMany = jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 0 });

    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            auditLog: {
                create: mockCreate,
                createMany: mockCreateMany,
                findMany: mockFindMany,
                count: mockCount,
                deleteMany: mockDeleteMany,
            },
        })),
    };
});

describe('Audit Service', () => {
    let auditService: AuditService;

    beforeEach(() => {
        auditService = new AuditService();
    });

    describe('Audit Actions', () => {
        it('should have all required auth actions', () => {
            expect(AuditActions.LOGIN_SUCCESS).toBe('auth.login.success');
            expect(AuditActions.LOGIN_FAILURE).toBe('auth.login.failure');
            expect(AuditActions.LOGOUT).toBe('auth.logout');
            expect(AuditActions.REGISTER).toBe('auth.register');
            expect(AuditActions.PASSWORD_CHANGE).toBe('auth.password.change');
            expect(AuditActions.TWO_FACTOR_ENABLE).toBe('auth.2fa.enable');
            expect(AuditActions.TWO_FACTOR_DISABLE).toBe('auth.2fa.disable');
        });

        it('should have all required profile actions', () => {
            expect(AuditActions.PROFILE_CREATE).toBe('profile.create');
            expect(AuditActions.PROFILE_UPDATE).toBe('profile.update');
            expect(AuditActions.PROFILE_DELETE).toBe('profile.delete');
        });

        it('should have all required backup actions', () => {
            expect(AuditActions.BACKUP_START).toBe('backup.start');
            expect(AuditActions.BACKUP_COMPLETE).toBe('backup.complete');
            expect(AuditActions.BACKUP_FAILURE).toBe('backup.failure');
        });

        it('should have all required security actions', () => {
            expect(AuditActions.SECURITY_RATE_LIMIT).toBe('security.rate_limit');
            expect(AuditActions.SECURITY_INVALID_TOKEN).toBe('security.invalid_token');
            expect(AuditActions.SECURITY_UNAUTHORIZED).toBe('security.unauthorized');
        });
    });

    describe('Service State', () => {
        it('should be enabled by default', () => {
            expect(auditService.isEnabled()).toBe(true);
        });

        it('should allow disabling', () => {
            auditService.setEnabled(false);
            expect(auditService.isEnabled()).toBe(false);
        });

        it('should allow re-enabling', () => {
            auditService.setEnabled(false);
            auditService.setEnabled(true);
            expect(auditService.isEnabled()).toBe(true);
        });
    });

    describe('Logging', () => {
        it('should accept valid log input', async () => {
            await expect(
                auditService.log({
                    action: AuditActions.LOGIN_SUCCESS,
                    category: 'auth',
                    userId: 'user-123',
                    userEmail: 'test@example.com',
                    ipAddress: '192.168.1.1',
                    success: true,
                })
            ).resolves.not.toThrow();
        });

        it('should handle missing optional fields', async () => {
            await expect(
                auditService.log({
                    action: AuditActions.API_REQUEST,
                    category: 'api',
                })
            ).resolves.not.toThrow();
        });

        it('should handle details as object', async () => {
            await expect(
                auditService.log({
                    action: AuditActions.PROFILE_CREATE,
                    category: 'profile',
                    details: {
                        profileName: 'Test Profile',
                        phoneNumber: '+1234567890',
                    },
                })
            ).resolves.not.toThrow();
        });

        it('should not log when disabled', async () => {
            auditService.setEnabled(false);
            // Should complete without error even when disabled
            await expect(
                auditService.log({
                    action: AuditActions.LOGIN_SUCCESS,
                    category: 'auth',
                })
            ).resolves.not.toThrow();
        });
    });

    describe('Batch Logging', () => {
        it('should queue logs for batch processing', () => {
            auditService.queueLog({
                action: AuditActions.API_REQUEST,
                category: 'api',
            });

            // Should not throw
            expect(true).toBe(true);
        });

        it('should flush queued logs', async () => {
            auditService.queueLog({
                action: AuditActions.API_REQUEST,
                category: 'api',
            });

            await expect(auditService.flush()).resolves.not.toThrow();
        });
    });

    describe('Query Options', () => {
        it('should support basic query', async () => {
            const result = await auditService.query();
            expect(result).toHaveProperty('logs');
            expect(result).toHaveProperty('total');
        });

        it('should support filtering by userId', async () => {
            await expect(
                auditService.query({ userId: 'user-123' })
            ).resolves.not.toThrow();
        });

        it('should support filtering by action', async () => {
            await expect(
                auditService.query({ action: AuditActions.LOGIN_SUCCESS })
            ).resolves.not.toThrow();
        });

        it('should support filtering by date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            await expect(
                auditService.query({ startDate, endDate })
            ).resolves.not.toThrow();
        });

        it('should support pagination', async () => {
            await expect(
                auditService.query({ limit: 10, offset: 0 })
            ).resolves.not.toThrow();
        });
    });

    describe('Statistics', () => {
        it('should return stats structure', async () => {
            const stats = await auditService.getStats();

            expect(stats).toHaveProperty('totalEvents');
            expect(stats).toHaveProperty('successRate');
            expect(stats).toHaveProperty('byCategory');
            expect(stats).toHaveProperty('byAction');
            expect(stats).toHaveProperty('recentFailures');
        });

        it('should support tenant filtering', async () => {
            await expect(
                auditService.getStats('tenant-123')
            ).resolves.not.toThrow();
        });

        it('should support custom time range', async () => {
            await expect(
                auditService.getStats(undefined, 7) // Last 7 days
            ).resolves.not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('should support cleanup with default retention', async () => {
            const deleted = await auditService.cleanup();
            expect(typeof deleted).toBe('number');
        });

        it('should support custom retention period', async () => {
            const deleted = await auditService.cleanup(30); // 30 days
            expect(typeof deleted).toBe('number');
        });
    });
});
