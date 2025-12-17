import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// Master key storage path
const ENCRYPTION_CONFIG_PATH = path.join(process.cwd(), '.encryption');

interface EncryptedData {
    iv: string;        // Base64 encoded
    salt: string;      // Base64 encoded
    authTag: string;   // Base64 encoded
    data: string;      // Base64 encoded encrypted data
    version: number;
}

interface EncryptionConfig {
    masterKeyHash: string; // SHA-256 hash of the master key (for verification)
    createdAt: string;
    version: number;
}

/**
 * Session Data Encryption Service
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
    private masterKey: Buffer | null = null;
    private isInitialized: boolean = false;

    /**
     * Initialize encryption with a master password
     * This should be called at server startup
     */
    async initialize(masterPassword?: string): Promise<boolean> {
        if (this.isInitialized && this.masterKey) {
            return true;
        }

        // Try to load from environment first
        const envPassword = process.env.ENCRYPTION_KEY || masterPassword;

        if (!envPassword) {
            console.warn('No encryption key provided. Session encryption is disabled.');
            console.warn('Set ENCRYPTION_KEY environment variable to enable encryption.');
            return false;
        }

        // Derive a consistent key from the password
        const salt = this.getOrCreateSalt();
        this.masterKey = await this.deriveKey(envPassword, salt);
        this.isInitialized = true;

        // Verify or save the key hash for consistency checks
        await this.verifyOrSaveKeyHash();

        console.log('Encryption service initialized successfully');
        return true;
    }

    /**
     * Check if encryption is enabled and initialized
     */
    isEnabled(): boolean {
        return this.isInitialized && this.masterKey !== null;
    }

    /**
     * Encrypt a string or buffer
     */
    encrypt(data: string | Buffer): EncryptedData | null {
        if (!this.isEnabled()) {
            return null;
        }

        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const salt = crypto.randomBytes(SALT_LENGTH);
            const key = crypto.pbkdf2Sync(this.masterKey!, salt, 1000, KEY_LENGTH, 'sha256');

            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

            const inputBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
            const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
            const authTag = cipher.getAuthTag();

            return {
                iv: iv.toString('base64'),
                salt: salt.toString('base64'),
                authTag: authTag.toString('base64'),
                data: encrypted.toString('base64'),
                version: 1
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }

    /**
     * Decrypt encrypted data
     */
    decrypt(encryptedData: EncryptedData): Buffer | null {
        if (!this.isEnabled()) {
            return null;
        }

        try {
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const salt = Buffer.from(encryptedData.salt, 'base64');
            const authTag = Buffer.from(encryptedData.authTag, 'base64');
            const encrypted = Buffer.from(encryptedData.data, 'base64');

            const key = crypto.pbkdf2Sync(this.masterKey!, salt, 1000, KEY_LENGTH, 'sha256');

            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            return Buffer.concat([decipher.update(encrypted), decipher.final()]);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    /**
     * Decrypt to string
     */
    decryptToString(encryptedData: EncryptedData): string | null {
        const buffer = this.decrypt(encryptedData);
        return buffer ? buffer.toString('utf8') : null;
    }

    /**
     * Encrypt a JSON object
     */
    encryptJSON<T>(data: T): EncryptedData | null {
        try {
            const jsonString = JSON.stringify(data);
            return this.encrypt(jsonString);
        } catch (error) {
            console.error('JSON encryption failed:', error);
            return null;
        }
    }

    /**
     * Decrypt to JSON object
     */
    decryptJSON<T>(encryptedData: EncryptedData): T | null {
        try {
            const jsonString = this.decryptToString(encryptedData);
            if (!jsonString) return null;
            return JSON.parse(jsonString) as T;
        } catch (error) {
            console.error('JSON decryption failed:', error);
            return null;
        }
    }

    /**
     * Encrypt a file and save it with .enc extension
     */
    async encryptFile(inputPath: string, outputPath?: string): Promise<boolean> {
        if (!this.isEnabled()) {
            return false;
        }

        try {
            const fileData = fs.readFileSync(inputPath);
            const encrypted = this.encrypt(fileData);

            if (!encrypted) {
                return false;
            }

            const encPath = outputPath || `${inputPath}.enc`;
            fs.writeFileSync(encPath, JSON.stringify(encrypted));

            return true;
        } catch (error) {
            console.error('File encryption failed:', error);
            return false;
        }
    }

    /**
     * Decrypt a file
     */
    async decryptFile(inputPath: string, outputPath?: string): Promise<boolean> {
        if (!this.isEnabled()) {
            return false;
        }

        try {
            const encryptedContent = fs.readFileSync(inputPath, 'utf8');
            const encryptedData: EncryptedData = JSON.parse(encryptedContent);

            const decrypted = this.decrypt(encryptedData);
            if (!decrypted) {
                return false;
            }

            const outPath = outputPath || inputPath.replace(/\.enc$/, '');
            fs.writeFileSync(outPath, decrypted);

            return true;
        } catch (error) {
            console.error('File decryption failed:', error);
            return false;
        }
    }

    /**
     * Encrypt sensitive session storage state
     */
    async encryptSessionState(profileId: string, storageState: object): Promise<string | null> {
        if (!this.isEnabled()) {
            // Return plain JSON if encryption is disabled
            return JSON.stringify(storageState);
        }

        const encrypted = this.encryptJSON(storageState);
        if (!encrypted) {
            return null;
        }

        return JSON.stringify(encrypted);
    }

    /**
     * Decrypt session storage state
     */
    async decryptSessionState(profileId: string, encryptedState: string): Promise<object | null> {
        try {
            const parsed = JSON.parse(encryptedState);

            // Check if it's encrypted (has our encryption format)
            if (parsed.iv && parsed.salt && parsed.authTag && parsed.data) {
                if (!this.isEnabled()) {
                    console.error('Cannot decrypt session - encryption service not initialized');
                    return null;
                }
                return this.decryptJSON<object>(parsed);
            }

            // Not encrypted, return as-is
            return parsed;
        } catch (error) {
            console.error('Failed to decrypt session state:', error);
            return null;
        }
    }

    /**
     * Hash sensitive data for storage (one-way)
     */
    hash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate a secure random token
     */
    generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate a secure random password
     */
    generatePassword(length: number = 24): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        const randomValues = crypto.randomBytes(length);
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }
        return password;
    }

    // Private methods

    private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256', (err, key) => {
                if (err) reject(err);
                else resolve(key);
            });
        });
    }

    private getOrCreateSalt(): Buffer {
        const saltPath = path.join(ENCRYPTION_CONFIG_PATH, 'salt');

        try {
            if (!fs.existsSync(ENCRYPTION_CONFIG_PATH)) {
                fs.mkdirSync(ENCRYPTION_CONFIG_PATH, { recursive: true });
            }

            if (fs.existsSync(saltPath)) {
                return Buffer.from(fs.readFileSync(saltPath, 'utf8'), 'base64');
            }

            // Generate new salt
            const salt = crypto.randomBytes(SALT_LENGTH);
            fs.writeFileSync(saltPath, salt.toString('base64'));
            return salt;
        } catch (error) {
            console.error('Failed to get/create salt:', error);
            // Fallback to deterministic salt (less secure but won't break)
            return crypto.createHash('sha256').update('whatsapp-multi-user-salt').digest().slice(0, SALT_LENGTH);
        }
    }

    private async verifyOrSaveKeyHash(): Promise<void> {
        if (!this.masterKey) return;

        const configPath = path.join(ENCRYPTION_CONFIG_PATH, 'config.json');
        const keyHash = crypto.createHash('sha256').update(this.masterKey).digest('hex');

        try {
            if (fs.existsSync(configPath)) {
                const config: EncryptionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                if (config.masterKeyHash !== keyHash) {
                    console.warn('WARNING: Encryption key has changed. Previously encrypted data may not be decryptable.');
                }
            } else {
                // Save new config
                const config: EncryptionConfig = {
                    masterKeyHash: keyHash,
                    createdAt: new Date().toISOString(),
                    version: 1
                };
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            }
        } catch (error) {
            console.error('Failed to verify/save key hash:', error);
        }
    }
}

// Singleton instance
export const encryptionService = new EncryptionService();

/**
 * Helper to encrypt sensitive message content before storage
 */
export function encryptMessageContent(content: string): string | null {
    if (!encryptionService.isEnabled()) {
        return content;
    }

    const encrypted = encryptionService.encrypt(content);
    if (!encrypted) {
        return null;
    }

    return JSON.stringify(encrypted);
}

/**
 * Helper to decrypt message content
 */
export function decryptMessageContent(encryptedContent: string): string | null {
    try {
        const parsed = JSON.parse(encryptedContent);

        // Check if encrypted
        if (parsed.iv && parsed.data) {
            if (!encryptionService.isEnabled()) {
                console.warn('Cannot decrypt content - encryption not enabled');
                return '[Encrypted content]';
            }
            return encryptionService.decryptToString(parsed);
        }

        // Not encrypted
        return encryptedContent;
    } catch {
        // Plain text, not JSON
        return encryptedContent;
    }
}

/**
 * Initialize encryption on server startup
 */
export async function initializeEncryption(): Promise<boolean> {
    return encryptionService.initialize();
}
