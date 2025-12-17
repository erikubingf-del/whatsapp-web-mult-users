import * as crypto from 'crypto';
import { encryptionService } from './encryption';

// TOTP Configuration
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = 'sha1';
const SECRET_LENGTH = 20; // bytes
const BACKUP_CODES_COUNT = 10;

// Base32 alphabet for encoding secrets
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Two-Factor Authentication Service using TOTP (RFC 6238)
 */
export class TOTPService {
    /**
     * Generate a new TOTP secret
     */
    generateSecret(): string {
        const buffer = crypto.randomBytes(SECRET_LENGTH);
        return this.base32Encode(buffer);
    }

    /**
     * Generate backup codes for account recovery
     */
    generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
            // Generate 8-character alphanumeric codes
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
        }
        return codes;
    }

    /**
     * Generate the current TOTP code for a secret
     */
    generateCode(secret: string, timestamp?: number): string {
        const time = timestamp || Date.now();
        const counter = Math.floor(time / 1000 / TOTP_PERIOD);
        return this.generateHOTP(secret, counter);
    }

    /**
     * Verify a TOTP code against a secret
     * Allows 1 time step in either direction for clock drift
     */
    verifyCode(secret: string, code: string, window: number = 1): boolean {
        if (!code || code.length !== TOTP_DIGITS) {
            return false;
        }

        const time = Date.now();
        const counter = Math.floor(time / 1000 / TOTP_PERIOD);

        // Check current and adjacent time windows
        for (let i = -window; i <= window; i++) {
            const expectedCode = this.generateHOTP(secret, counter + i);
            if (this.secureCompare(code, expectedCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verify a backup code
     * Returns the index of the used code, or -1 if invalid
     */
    verifyBackupCode(codes: string[], code: string): number {
        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

        for (let i = 0; i < codes.length; i++) {
            const normalizedStored = codes[i].replace(/[^A-Z0-9]/g, '');
            if (this.secureCompare(normalizedCode, normalizedStored)) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Generate a QR code URL for authenticator apps
     */
    generateQRCodeURL(secret: string, email: string, issuer: string = 'WhatsApp Manager'): string {
        const encodedIssuer = encodeURIComponent(issuer);
        const encodedEmail = encodeURIComponent(email);
        const otpauthURL = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

        // Return a Google Charts QR code URL (works without additional dependencies)
        return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthURL)}`;
    }

    /**
     * Generate the otpauth:// URL for manual entry in authenticator apps
     */
    generateOTPAuthURL(secret: string, email: string, issuer: string = 'WhatsApp Manager'): string {
        const encodedIssuer = encodeURIComponent(issuer);
        const encodedEmail = encodeURIComponent(email);
        return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
    }

    /**
     * Encrypt a TOTP secret for storage
     */
    encryptSecret(secret: string): string | null {
        if (!encryptionService.isEnabled()) {
            // Fall back to simple obfuscation if encryption is disabled
            return Buffer.from(secret).toString('base64');
        }

        const encrypted = encryptionService.encrypt(secret);
        return encrypted ? JSON.stringify(encrypted) : null;
    }

    /**
     * Decrypt a stored TOTP secret
     */
    decryptSecret(encryptedSecret: string): string | null {
        try {
            // Check if it's base64 (non-encrypted)
            if (!encryptedSecret.startsWith('{')) {
                return Buffer.from(encryptedSecret, 'base64').toString('utf8');
            }

            if (!encryptionService.isEnabled()) {
                console.warn('Cannot decrypt TOTP secret - encryption not enabled');
                return null;
            }

            const parsed = JSON.parse(encryptedSecret);
            return encryptionService.decryptToString(parsed);
        } catch (error) {
            console.error('Failed to decrypt TOTP secret:', error);
            return null;
        }
    }

    /**
     * Encrypt backup codes for storage
     */
    encryptBackupCodes(codes: string[]): string | null {
        const json = JSON.stringify(codes);

        if (!encryptionService.isEnabled()) {
            return Buffer.from(json).toString('base64');
        }

        const encrypted = encryptionService.encrypt(json);
        return encrypted ? JSON.stringify(encrypted) : null;
    }

    /**
     * Decrypt stored backup codes
     */
    decryptBackupCodes(encryptedCodes: string): string[] | null {
        try {
            if (!encryptedCodes.startsWith('{')) {
                const json = Buffer.from(encryptedCodes, 'base64').toString('utf8');
                return JSON.parse(json);
            }

            if (!encryptionService.isEnabled()) {
                console.warn('Cannot decrypt backup codes - encryption not enabled');
                return null;
            }

            const parsed = JSON.parse(encryptedCodes);
            const json = encryptionService.decryptToString(parsed);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Failed to decrypt backup codes:', error);
            return null;
        }
    }

    // Private methods

    /**
     * Generate HMAC-based One-Time Password (HOTP)
     */
    private generateHOTP(secret: string, counter: number): string {
        // Decode base32 secret
        const secretBuffer = this.base32Decode(secret);

        // Convert counter to 8-byte buffer (big-endian)
        const counterBuffer = Buffer.alloc(8);
        for (let i = 7; i >= 0; i--) {
            counterBuffer[i] = counter & 0xff;
            counter = Math.floor(counter / 256);
        }

        // Generate HMAC
        const hmac = crypto.createHmac(TOTP_ALGORITHM, secretBuffer);
        hmac.update(counterBuffer);
        const hash = hmac.digest();

        // Dynamic truncation
        const offset = hash[hash.length - 1] & 0xf;
        const binary =
            ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);

        // Generate TOTP_DIGITS digit code
        const otp = binary % Math.pow(10, TOTP_DIGITS);
        return otp.toString().padStart(TOTP_DIGITS, '0');
    }

    /**
     * Encode bytes to base32
     */
    private base32Encode(buffer: Buffer): string {
        let result = '';
        let bits = 0;
        let value = 0;

        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;

            while (bits >= 5) {
                bits -= 5;
                result += BASE32_ALPHABET[(value >> bits) & 0x1f];
            }
        }

        if (bits > 0) {
            result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
        }

        return result;
    }

    /**
     * Decode base32 to bytes
     */
    private base32Decode(encoded: string): Buffer {
        const sanitized = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
        const bytes: number[] = [];
        let bits = 0;
        let value = 0;

        for (let i = 0; i < sanitized.length; i++) {
            const index = BASE32_ALPHABET.indexOf(sanitized[i]);
            if (index === -1) continue;

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8) {
                bits -= 8;
                bytes.push((value >> bits) & 0xff);
            }
        }

        return Buffer.from(bytes);
    }

    /**
     * Timing-safe string comparison to prevent timing attacks
     */
    private secureCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);

        return crypto.timingSafeEqual(bufA, bufB);
    }
}

// Singleton instance
export const totpService = new TOTPService();

/**
 * Setup 2FA for a user
 * Returns the secret and QR code URL for the user to scan
 */
export interface TwoFactorSetupResult {
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
    backupCodes: string[];
    encryptedSecret: string;
    encryptedBackupCodes: string;
}

export function setup2FA(email: string): TwoFactorSetupResult | null {
    try {
        const secret = totpService.generateSecret();
        const backupCodes = totpService.generateBackupCodes();

        const encryptedSecret = totpService.encryptSecret(secret);
        const encryptedBackupCodes = totpService.encryptBackupCodes(backupCodes);

        if (!encryptedSecret || !encryptedBackupCodes) {
            return null;
        }

        return {
            secret,
            qrCodeUrl: totpService.generateQRCodeURL(secret, email),
            otpauthUrl: totpService.generateOTPAuthURL(secret, email),
            backupCodes,
            encryptedSecret,
            encryptedBackupCodes,
        };
    } catch (error) {
        console.error('Failed to setup 2FA:', error);
        return null;
    }
}

/**
 * Verify a 2FA code
 */
export function verify2FA(encryptedSecret: string, code: string): boolean {
    const secret = totpService.decryptSecret(encryptedSecret);
    if (!secret) {
        return false;
    }

    return totpService.verifyCode(secret, code);
}

/**
 * Verify and consume a backup code
 * Returns the updated backup codes array (with used code removed), or null if invalid
 */
export function verifyBackupCode(encryptedBackupCodes: string, code: string): string[] | null {
    const codes = totpService.decryptBackupCodes(encryptedBackupCodes);
    if (!codes) {
        return null;
    }

    const index = totpService.verifyBackupCode(codes, code);
    if (index === -1) {
        return null;
    }

    // Remove the used backup code
    codes.splice(index, 1);
    return codes;
}
