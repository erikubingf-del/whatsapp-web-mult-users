import path from 'path';
import fs from 'fs/promises';

const SESSIONS_DIR = path.join(process.cwd(), '.sessions');

export async function ensureSessionsDir() {
    try {
        await fs.access(SESSIONS_DIR);
    } catch {
        await fs.mkdir(SESSIONS_DIR, { recursive: true });
    }
}

export function getSessionPath(profileId: string): string {
    return path.join(SESSIONS_DIR, `${profileId}.json`);
}
