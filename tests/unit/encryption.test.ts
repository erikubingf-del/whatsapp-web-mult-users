import { describe, it, expect, beforeAll } from '@jest/globals';
import { EncryptionService } from '../../server/services/encryption';

describe('Encryption Service', () => {
    let encryptionService: EncryptionService;

    beforeAll(async () => {
        encryptionService = new EncryptionService();
        // Initialize with a test key
        process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing';
        await encryptionService.initialize('test-encryption-key-for-testing');
    });

    describe('Basic Encryption', () => {
        it('should encrypt and decrypt a string', () => {
            const plaintext = 'Hello, World!';
            const encrypted = encryptionService.encrypt(plaintext);

            expect(encrypted).not.toBeNull();
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('salt');
            expect(encrypted).toHaveProperty('authTag');
            expect(encrypted).toHaveProperty('data');
            expect(encrypted).toHaveProperty('version');

            const decrypted = encryptionService.decryptToString(encrypted!);
            expect(decrypted).toBe(plaintext);
        });

        it('should encrypt and decrypt a buffer', () => {
            const plainBuffer = Buffer.from('Binary data test');
            const encrypted = encryptionService.encrypt(plainBuffer);

            expect(encrypted).not.toBeNull();

            const decrypted = encryptionService.decrypt(encrypted!);
            expect(decrypted).not.toBeNull();
            expect(decrypted!.toString()).toBe(plainBuffer.toString());
        });

        it('should produce different ciphertext for same plaintext', () => {
            const plaintext = 'Same message';
            const encrypted1 = encryptionService.encrypt(plaintext);
            const encrypted2 = encryptionService.encrypt(plaintext);

            expect(encrypted1).not.toBeNull();
            expect(encrypted2).not.toBeNull();
            // IV and salt should be different (random)
            expect(encrypted1!.iv).not.toBe(encrypted2!.iv);
            expect(encrypted1!.salt).not.toBe(encrypted2!.salt);
        });
    });

    describe('JSON Encryption', () => {
        it('should encrypt and decrypt JSON objects', () => {
            const data = {
                userId: '12345',
                settings: {
                    theme: 'dark',
                    notifications: true,
                },
                tags: ['tag1', 'tag2'],
            };

            const encrypted = encryptionService.encryptJSON(data);
            expect(encrypted).not.toBeNull();

            const decrypted = encryptionService.decryptJSON(encrypted!);
            expect(decrypted).toEqual(data);
        });

        it('should handle empty objects', () => {
            const data = {};
            const encrypted = encryptionService.encryptJSON(data);
            const decrypted = encryptionService.decryptJSON(encrypted!);
            expect(decrypted).toEqual(data);
        });

        it('should handle arrays', () => {
            const data = [1, 2, 3, 'four', { five: 5 }];
            const encrypted = encryptionService.encryptJSON(data);
            const decrypted = encryptionService.decryptJSON<unknown[]>(encrypted!);
            expect(decrypted).toEqual(data);
        });
    });

    describe('Utility Functions', () => {
        it('should generate consistent hashes', () => {
            const data = 'test data';
            const hash1 = encryptionService.hash(data);
            const hash2 = encryptionService.hash(data);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });

        it('should generate unique tokens', () => {
            const token1 = encryptionService.generateToken();
            const token2 = encryptionService.generateToken();

            expect(token1).not.toBe(token2);
            expect(token1).toHaveLength(64); // 32 bytes = 64 hex characters
        });

        it('should generate tokens of specified length', () => {
            const token = encryptionService.generateToken(16);
            expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
        });

        it('should generate secure passwords', () => {
            const password = encryptionService.generatePassword(24);
            expect(password).toHaveLength(24);
            // Should contain variety of characters
            expect(/[a-z]/.test(password) || /[A-Z]/.test(password) || /[0-9]/.test(password)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty strings', () => {
            const encrypted = encryptionService.encrypt('');
            const decrypted = encryptionService.decryptToString(encrypted!);
            expect(decrypted).toBe('');
        });

        it('should handle special characters', () => {
            const special = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\' \n\t\r';
            const encrypted = encryptionService.encrypt(special);
            const decrypted = encryptionService.decryptToString(encrypted!);
            expect(decrypted).toBe(special);
        });

        it('should handle unicode characters', () => {
            const unicode = 'Hello World! Bonjour le monde!';
            const encrypted = encryptionService.encrypt(unicode);
            const decrypted = encryptionService.decryptToString(encrypted!);
            expect(decrypted).toBe(unicode);
        });

        it('should handle large data', () => {
            const largeData = 'x'.repeat(100000); // 100KB
            const encrypted = encryptionService.encrypt(largeData);
            const decrypted = encryptionService.decryptToString(encrypted!);
            expect(decrypted).toBe(largeData);
        });
    });

    describe('Session State Encryption', () => {
        it('should encrypt and decrypt session state', async () => {
            const sessionState = {
                cookies: [
                    { name: 'session', value: 'abc123', domain: '.whatsapp.com' },
                ],
                origins: [
                    { origin: 'https://web.whatsapp.com', localStorage: [] },
                ],
            };

            const encrypted = await encryptionService.encryptSessionState('test-profile', sessionState);
            expect(encrypted).not.toBeNull();

            const decrypted = await encryptionService.decryptSessionState('test-profile', encrypted!);
            expect(decrypted).toEqual(sessionState);
        });
    });
});
