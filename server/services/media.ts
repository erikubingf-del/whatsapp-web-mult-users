import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Media storage configuration
const MEDIA_DIR = path.join(process.cwd(), 'public', 'uploads', 'media');

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export interface MediaDownloadResult {
    success: boolean;
    localPath?: string;
    relativePath?: string;
    fileSize?: number;
    mimeType?: string;
    error?: string;
}

export interface MediaInfo {
    hasMedia: boolean;
    mediaUrl?: string;
    mediaType?: string;
    directPath?: string;
    mediaKey?: string;
    mimetype?: string;
}

/**
 * Media Download Service
 * Downloads media from WhatsApp Web and stores it locally
 */
export class MediaDownloader {
    private page: Page;
    private profileId: string;

    constructor(page: Page, profileId: string) {
        this.page = page;
        this.profileId = profileId;
    }

    /**
     * Get the profile's media directory, creating it if needed
     */
    private getProfileMediaDir(): string {
        const profileDir = path.join(MEDIA_DIR, this.profileId);
        if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
        }
        return profileDir;
    }

    /**
     * Generate a unique filename for media
     */
    private generateFilename(messageId: string, mimeType?: string): string {
        const hash = crypto.createHash('md5').update(messageId).digest('hex').substring(0, 8);
        const extension = this.getExtensionFromMimeType(mimeType);
        return `${Date.now()}_${hash}${extension}`;
    }

    /**
     * Get file extension from MIME type
     */
    private getExtensionFromMimeType(mimeType?: string): string {
        if (!mimeType) return '.bin';

        const mimeMap: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'video/mp4': '.mp4',
            'video/3gpp': '.3gp',
            'video/webm': '.webm',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.m4a',
            'audio/opus': '.opus',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        };

        return mimeMap[mimeType] || '.bin';
    }

    /**
     * Download media from a blob URL (for visible images in DOM)
     */
    async downloadFromBlob(blobUrl: string, messageId: string, mimeType?: string): Promise<MediaDownloadResult> {
        try {
            console.log(`Downloading blob media for message ${messageId}...`);

            // Fetch blob data in the browser context and convert to base64
            const base64Data = await this.page.evaluate(async (url: string) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('Failed to read blob'));
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    return null;
                }
            }, blobUrl);

            if (!base64Data) {
                return { success: false, error: 'Failed to fetch blob data' };
            }

            // Extract the actual base64 content (remove data:mime;base64, prefix)
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return { success: false, error: 'Invalid base64 data format' };
            }

            const detectedMimeType = matches[1] || mimeType;
            const buffer = Buffer.from(matches[2], 'base64');

            // Save to file
            const filename = this.generateFilename(messageId, detectedMimeType);
            const profileDir = this.getProfileMediaDir();
            const localPath = path.join(profileDir, filename);

            fs.writeFileSync(localPath, buffer);

            // Return relative path for database storage
            const relativePath = `/uploads/media/${this.profileId}/${filename}`;

            console.log(`Media saved: ${relativePath} (${buffer.length} bytes)`);

            return {
                success: true,
                localPath,
                relativePath,
                fileSize: buffer.length,
                mimeType: detectedMimeType
            };
        } catch (error: any) {
            console.error('Blob download failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download media from WhatsApp's CDN using directPath
     * This requires WhatsApp to be authenticated
     */
    async downloadFromDirectPath(directPath: string, messageId: string, mediaKey?: string, mimeType?: string): Promise<MediaDownloadResult> {
        try {
            console.log(`Downloading media from directPath for message ${messageId}...`);

            // Construct the full URL
            const baseUrl = 'https://mmg.whatsapp.net';
            const fullUrl = directPath.startsWith('http') ? directPath : `${baseUrl}${directPath}`;

            // Try to download using browser context (uses WhatsApp's cookies)
            const mediaData = await this.page.evaluate(async ({ url }: { url: string, key?: string }): Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }> => {
                try {
                    // First try direct fetch
                    const response = await fetch(url, {
                        credentials: 'include',
                        headers: {
                            'Origin': 'https://web.whatsapp.com',
                            'Referer': 'https://web.whatsapp.com/'
                        }
                    });

                    if (!response.ok) {
                        return { success: false, error: `HTTP ${response.status}` };
                    }

                    const blob = await response.blob();
                    return new Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({
                            success: true,
                            data: reader.result as string,
                            mimeType: blob.type
                        });
                        reader.onerror = () => resolve({ success: false, error: 'Failed to read response' });
                        reader.readAsDataURL(blob);
                    });
                } catch (e: unknown) {
                    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
                    return { success: false, error: errorMsg };
                }
            }, { url: fullUrl, key: mediaKey });

            if (!mediaData.success || !mediaData.data) {
                return { success: false, error: mediaData.error || 'Download failed' };
            }

            // Parse base64 data
            const mediaDataContent = mediaData.data;
            const matches = mediaDataContent.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return { success: false, error: 'Invalid media data format' };
            }

            const detectedMimeType = mediaData.mimeType || matches[1] || mimeType;
            const buffer = Buffer.from(matches[2], 'base64');

            // Save to file
            const filename = this.generateFilename(messageId, detectedMimeType);
            const profileDir = this.getProfileMediaDir();
            const localPath = path.join(profileDir, filename);

            fs.writeFileSync(localPath, buffer);

            const relativePath = `/uploads/media/${this.profileId}/${filename}`;

            console.log(`Media saved from CDN: ${relativePath} (${buffer.length} bytes)`);

            return {
                success: true,
                localPath,
                relativePath,
                fileSize: buffer.length,
                mimeType: detectedMimeType
            };
        } catch (error: any) {
            console.error('DirectPath download failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract and download media from a message in the DOM
     * This works for visible messages with images/videos
     */
    async extractMediaFromMessage(messageSelector: string, messageId: string): Promise<MediaDownloadResult> {
        try {
            // Find media elements in the message
            const mediaInfo = await this.page.evaluate((selector: string) => {
                const msgEl = document.querySelector(selector);
                if (!msgEl) return null;

                // Check for image
                const img = msgEl.querySelector('img[src^="blob:"]') as HTMLImageElement;
                if (img && img.src) {
                    return { type: 'image', url: img.src };
                }

                // Check for video
                const video = msgEl.querySelector('video[src^="blob:"]') as HTMLVideoElement;
                if (video && video.src) {
                    return { type: 'video', url: video.src };
                }

                // Check for audio
                const audio = msgEl.querySelector('audio[src^="blob:"]') as HTMLAudioElement;
                if (audio && audio.src) {
                    return { type: 'audio', url: audio.src };
                }

                return null;
            }, messageSelector);

            if (!mediaInfo) {
                return { success: false, error: 'No media found in message' };
            }

            const mimeType = mediaInfo.type === 'image' ? 'image/jpeg' :
                            mediaInfo.type === 'video' ? 'video/mp4' :
                            mediaInfo.type === 'audio' ? 'audio/ogg' : undefined;

            return this.downloadFromBlob(mediaInfo.url, messageId, mimeType);
        } catch (error: any) {
            console.error('Media extraction failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download media for a batch of messages
     * Returns a map of messageId -> local path
     */
    async downloadMediaBatch(messages: Array<{
        id: string;
        hasMedia: boolean;
        mediaUrl?: string;
        directPath?: string;
        mediaKey?: string;
        mimetype?: string;
    }>, maxConcurrent: number = 3): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        const mediaMessages = messages.filter(m => m.hasMedia && (m.mediaUrl || m.directPath));

        console.log(`Downloading media for ${mediaMessages.length} messages...`);

        // Process in batches to avoid overwhelming the connection
        for (let i = 0; i < mediaMessages.length; i += maxConcurrent) {
            const batch = mediaMessages.slice(i, i + maxConcurrent);

            const batchPromises = batch.map(async (msg) => {
                let result: MediaDownloadResult;

                if (msg.mediaUrl?.startsWith('blob:')) {
                    result = await this.downloadFromBlob(msg.mediaUrl, msg.id, msg.mimetype);
                } else if (msg.directPath) {
                    result = await this.downloadFromDirectPath(
                        msg.directPath,
                        msg.id,
                        msg.mediaKey,
                        msg.mimetype
                    );
                } else {
                    return;
                }

                if (result.success && result.relativePath) {
                    results.set(msg.id, result.relativePath);
                }
            });

            await Promise.all(batchPromises);

            // Small delay between batches
            if (i + maxConcurrent < mediaMessages.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`Successfully downloaded ${results.size}/${mediaMessages.length} media files`);
        return results;
    }
}

/**
 * Clean up old media files for a profile
 * @param profileId Profile ID
 * @param maxAgeDays Maximum age in days (default: 90)
 */
export async function cleanupOldMedia(profileId: string, maxAgeDays: number = 90): Promise<number> {
    const profileDir = path.join(MEDIA_DIR, profileId);
    if (!fs.existsSync(profileDir)) {
        return 0;
    }

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    const files = fs.readdirSync(profileDir);
    for (const file of files) {
        const filePath = path.join(profileDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            deletedCount++;
        }
    }

    console.log(`Cleaned up ${deletedCount} old media files for profile ${profileId}`);
    return deletedCount;
}

/**
 * Get total media storage size for a profile
 * @param profileId Profile ID
 */
export function getMediaStorageSize(profileId: string): { files: number; bytes: number } {
    const profileDir = path.join(MEDIA_DIR, profileId);
    if (!fs.existsSync(profileDir)) {
        return { files: 0, bytes: 0 };
    }

    const files = fs.readdirSync(profileDir);
    let totalBytes = 0;

    for (const file of files) {
        const filePath = path.join(profileDir, file);
        const stats = fs.statSync(filePath);
        totalBytes += stats.size;
    }

    return { files: files.length, bytes: totalBytes };
}
