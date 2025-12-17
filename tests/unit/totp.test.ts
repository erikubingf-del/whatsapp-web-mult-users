import { describe, it, expect, beforeAll } from '@jest/globals';
import { TOTPService, setup2FA, verify2FA, verifyBackupCode } from '../../server/services/totp';
import { EncryptionService } from '../../server/services/encryption';

describe('TOTP Service', () => {
    let totpService: TOTPService;

    beforeAll(async () => {
        totpService = new TOTPService();
        // Initialize encryption for backup code tests
        const encryptionService = new EncryptionService();
        process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing';
        await encryptionService.initialize('test-encryption-key-for-testing');
    });

    describe('Secret Generation', () => {
        it('should generate a base32 secret', () => {
            const secret = totpService.generateSecret();

            expect(secret).toBeDefined();
            expect(secret.length).toBeGreaterThan(0);
            // Base32 characters only
            expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
        });

        it('should generate unique secrets', () => {
            const secret1 = totpService.generateSecret();
            const secret2 = totpService.generateSecret();

            expect(secret1).not.toBe(secret2);
        });
    });

    describe('Code Generation', () => {
        it('should generate a 6-digit code', () => {
            const secret = totpService.generateSecret();
            const code = totpService.generateCode(secret);

            expect(code).toBeDefined();
            expect(code).toHaveLength(6);
            expect(/^\d{6}$/.test(code)).toBe(true);
        });

        it('should generate consistent codes for same timestamp', () => {
            const secret = totpService.generateSecret();
            const timestamp = Date.now();

            const code1 = totpService.generateCode(secret, timestamp);
            const code2 = totpService.generateCode(secret, timestamp);

            expect(code1).toBe(code2);
        });

        it('should generate different codes for different time windows', () => {
            const secret = totpService.generateSecret();
            const now = Date.now();
            const later = now + 31000; // 31 seconds later (next window)

            const code1 = totpService.generateCode(secret, now);
            const code2 = totpService.generateCode(secret, later);

            expect(code1).not.toBe(code2);
        });
    });

    describe('Code Verification', () => {
        it('should verify a valid code', () => {
            const secret = totpService.generateSecret();
            const code = totpService.generateCode(secret);

            const isValid = totpService.verifyCode(secret, code);
            expect(isValid).toBe(true);
        });

        it('should reject an invalid code', () => {
            const secret = totpService.generateSecret();

            const isValid = totpService.verifyCode(secret, '000000');
            expect(isValid).toBe(false);
        });

        it('should reject codes of wrong length', () => {
            const secret = totpService.generateSecret();

            expect(totpService.verifyCode(secret, '12345')).toBe(false);
            expect(totpService.verifyCode(secret, '1234567')).toBe(false);
            expect(totpService.verifyCode(secret, '')).toBe(false);
        });

        it('should accept codes within time window', () => {
            const secret = totpService.generateSecret();
            const now = Date.now();

            // Generate code for current window
            const code = totpService.generateCode(secret, now);

            // Should verify with window=1 (default)
            const isValid = totpService.verifyCode(secret, code, 1);
            expect(isValid).toBe(true);
        });
    });

    describe('Backup Codes', () => {
        it('should generate 10 backup codes', () => {
            const codes = totpService.generateBackupCodes();

            expect(codes).toHaveLength(10);
        });

        it('should generate codes in correct format', () => {
            const codes = totpService.generateBackupCodes();

            codes.forEach(code => {
                // Format: XXXX-XXXX
                expect(/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)).toBe(true);
            });
        });

        it('should generate unique codes', () => {
            const codes = totpService.generateBackupCodes();
            const uniqueCodes = new Set(codes);

            expect(uniqueCodes.size).toBe(codes.length);
        });

        it('should verify valid backup code', () => {
            const codes = totpService.generateBackupCodes();
            const codeToVerify = codes[0];

            const index = totpService.verifyBackupCode(codes, codeToVerify);
            expect(index).toBe(0);
        });

        it('should verify backup code case-insensitively', () => {
            const codes = ['ABCD-1234'];

            expect(totpService.verifyBackupCode(codes, 'abcd-1234')).toBe(0);
            expect(totpService.verifyBackupCode(codes, 'ABCD-1234')).toBe(0);
        });

        it('should return -1 for invalid backup code', () => {
            const codes = totpService.generateBackupCodes();

            const index = totpService.verifyBackupCode(codes, 'INVALID-CODE');
            expect(index).toBe(-1);
        });
    });

    describe('QR Code Generation', () => {
        it('should generate a valid QR code URL', () => {
            const secret = totpService.generateSecret();
            const email = 'test@example.com';

            const qrUrl = totpService.generateQRCodeURL(secret, email);

            expect(qrUrl).toContain('chart.googleapis.com');
            expect(qrUrl).toContain('qr');
            // Email is double-encoded in the URL (once in otpauth, once in the QR URL)
            expect(qrUrl).toContain('test');
            expect(qrUrl).toContain('example.com');
        });

        it('should generate a valid OTPAuth URL', () => {
            const secret = 'JBSWY3DPEHPK3PXP';
            const email = 'test@example.com';
            const issuer = 'TestApp';

            const otpauthUrl = totpService.generateOTPAuthURL(secret, email, issuer);

            expect(otpauthUrl).toContain('otpauth://totp/');
            expect(otpauthUrl).toContain(secret);
            expect(otpauthUrl).toContain('algorithm=SHA1');
            expect(otpauthUrl).toContain('digits=6');
            expect(otpauthUrl).toContain('period=30');
        });
    });

    describe('Secret Encryption', () => {
        it('should encrypt and decrypt a secret', () => {
            const secret = totpService.generateSecret();

            const encrypted = totpService.encryptSecret(secret);
            expect(encrypted).not.toBeNull();
            expect(encrypted).not.toBe(secret);

            const decrypted = totpService.decryptSecret(encrypted!);
            expect(decrypted).toBe(secret);
        });

        it('should encrypt and decrypt backup codes', () => {
            const codes = totpService.generateBackupCodes();

            const encrypted = totpService.encryptBackupCodes(codes);
            expect(encrypted).not.toBeNull();

            const decrypted = totpService.decryptBackupCodes(encrypted!);
            expect(decrypted).toEqual(codes);
        });
    });

    describe('2FA Setup Flow', () => {
        it('should setup 2FA for a user', () => {
            const result = setup2FA('test@example.com');

            expect(result).not.toBeNull();
            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('qrCodeUrl');
            expect(result).toHaveProperty('otpauthUrl');
            expect(result).toHaveProperty('backupCodes');
            expect(result).toHaveProperty('encryptedSecret');
            expect(result).toHaveProperty('encryptedBackupCodes');

            expect(result!.backupCodes).toHaveLength(10);
        });

        it('should verify 2FA code after setup', () => {
            const setup = setup2FA('test@example.com');
            expect(setup).not.toBeNull();

            // Generate a code using the secret
            const code = totpService.generateCode(setup!.secret);

            // Verify using encrypted secret
            const isValid = verify2FA(setup!.encryptedSecret, code);
            expect(isValid).toBe(true);
        });

        it('should verify and consume backup code', () => {
            const setup = setup2FA('test@example.com');
            expect(setup).not.toBeNull();

            const backupCode = setup!.backupCodes[0];

            // Verify and get remaining codes
            const remainingCodes = verifyBackupCode(setup!.encryptedBackupCodes, backupCode);

            expect(remainingCodes).not.toBeNull();
            expect(remainingCodes).toHaveLength(9);
            expect(remainingCodes).not.toContain(backupCode);
        });
    });
});
