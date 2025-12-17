import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { Scraper } from './scraper';
import { browserLogger, logEvent, logWithProfile } from '../logger';

interface SessionConfig {
  profileId: string;
  sessionPath: string;
}

// Callback type for when WhatsApp session becomes ready
export type SessionReadyCallback = (profileId: string, status: 'connected' | 'disconnected') => void;

export class BrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private scrapers: Map<string, Scraper> = new Map();
  private autoSaveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private screencastIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionWatchers: Map<string, NodeJS.Timeout> = new Map();
  private sessionsDir: string;

  // Callback for when a session becomes ready (WhatsApp loaded)
  private onSessionReady?: SessionReadyCallback;

  // Track which profiles have already triggered auto-backup this session
  private autoBackupTriggered: Set<string> = new Set();

  constructor() {
    this.sessionsDir = path.join(process.cwd(), 'sessions');
  }

  /**
   * Set a callback to be called when a WhatsApp session becomes ready
   * This can be used to trigger auto-backup
   */
  setSessionReadyCallback(callback: SessionReadyCallback) {
    this.onSessionReady = callback;
  }

  async init() {
    // No global browser needed for persistent contexts
    // Ensure the sessions directory exists
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      browserLogger.info('Sessions directory ensured', { path: this.sessionsDir });
    } catch (error) {
      browserLogger.error('Failed to create sessions directory', { path: this.sessionsDir, error });
    }
  }

  async close() {
    console.log('Closing all browser contexts...');
    for (const [profileId, context] of this.contexts) {
      try {
        await context.close();
      } catch (e) {
        console.error(`Error closing context for ${profileId}`, e);
      }
    }
    this.contexts.clear();
    this.pages.clear();
    this.scrapers.clear();
  }

  async createContext(config: SessionConfig): Promise<Page> {
    await this.init(); // Call init to ensure sessionsDir exists

    const { profileId, sessionPath } = config;

    // The instruction implies a shift to `launchPersistentContext`.
    // I will remove the old `newContext` logic and keep the `launchPersistentContext` part,
    // assuming the user intends to fully switch to persistent contexts.

    // Define userDataDir based on profileId and sessionsDir
    const userDataDir = path.join(this.sessionsDir, `${profileId}_data`);
    const sessionJsonPath = path.join(this.sessionsDir, `${profileId}.json`);

    let context: BrowserContext;

    try {
      const options: any = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        permissions: ['microphone'],
        ignoreDefaultArgs: ['--mute-audio'],
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--use-fake-ui-for-media-stream' // Auto-grant media permissions
        ]
      };

      // Migration: If no user data dir but we have a JSON session, use it to seed the persistent context
      const userDataDirExists = await fs.stat(userDataDir).then(() => true).catch(() => false);
      const sessionJsonExists = await fs.stat(sessionJsonPath).then(() => true).catch(() => false);

      if (!userDataDirExists && sessionJsonExists) {
        console.log(`Migrating existing session JSON for ${profileId}`);
        options.storageState = sessionJsonPath;
      }

      context = await chromium.launchPersistentContext(userDataDir, options);

      await context.grantPermissions(['microphone'], { origin: 'https://web.whatsapp.com' });

      this.contexts.set(profileId, context);

      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      this.pages.set(profileId, page);
      this.scrapers.set(profileId, new Scraper(page));

      console.log(`Navigating to WhatsApp Web for ${profileId}...`);
      try {
        await page.goto('https://web.whatsapp.com', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        console.log(`Navigated to WhatsApp Web for ${profileId}`);
      } catch (navError) {
        console.error(`Navigation error for ${profileId}:`, navError);
      }

      return page;

    } catch (e) {
      console.error(`Failed to create context for ${profileId}`, e);
      throw e;
    }
  }

  async initSession(profileId: string, profileName: string) {
    if (this.pages.has(profileId)) return;

    logEvent.sessionStart(profileId, profileName);

    // Reuse createContext logic which now handles persistent context
    const page = await this.createContext({ profileId, sessionPath: '' }); // sessionPath is unused/derived internally now

    // Set up crash handler for automatic recovery
    this.setupCrashHandler(page, profileId, profileName);

    // Start monitoring connection status for auto-backup
    this.startConnectionWatcher(profileId);
  }

  /**
   * Starts watching for WhatsApp connection status changes
   * Triggers auto-backup when session becomes connected
   */
  private startConnectionWatcher(profileId: string) {
    // Clear any existing watcher
    this.stopConnectionWatcher(profileId);

    browserLogger.debug('Starting connection watcher', { profileId });

    let lastStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';
    let checkCount = 0;
    const MAX_CHECKS = 300; // 5 minutes max (300 * 1000ms)

    const interval = setInterval(async () => {
      checkCount++;

      // Stop watching after max time
      if (checkCount > MAX_CHECKS) {
        browserLogger.warn('Connection watcher timeout', { profileId });
        this.stopConnectionWatcher(profileId);
        return;
      }

      try {
        const currentStatus = await this.getStatus(profileId);

        // Detect transition to connected state
        if (currentStatus === 'connected' && lastStatus !== 'connected') {
          logEvent.sessionConnect(profileId);

          // Notify listeners (SessionManager will handle auto-backup)
          if (this.onSessionReady) {
            this.onSessionReady(profileId, 'connected');
          }

          // Only auto-backup once per session init
          if (!this.autoBackupTriggered.has(profileId)) {
            this.autoBackupTriggered.add(profileId);
            logEvent.backupStart(profileId, 'auto');
          }

          // Keep watching for disconnections, but slow down the interval
          clearInterval(interval);
          this.connectionWatchers.delete(profileId);

          // Start a slower watcher for disconnect detection
          this.startDisconnectWatcher(profileId);
        }

        // Detect disconnect
        if (currentStatus === 'disconnected' && lastStatus === 'connected') {
          logEvent.sessionDisconnect(profileId);
          if (this.onSessionReady) {
            this.onSessionReady(profileId, 'disconnected');
          }
        }

        lastStatus = currentStatus;
      } catch (e) {
        // Page might be closed
        browserLogger.error('Connection watcher error', { profileId, error: e });
        this.stopConnectionWatcher(profileId);
      }
    }, 1000); // Check every second

    this.connectionWatchers.set(profileId, interval);
  }

  /**
   * Slower watcher to detect when a connected session disconnects
   */
  private startDisconnectWatcher(profileId: string) {
    const interval = setInterval(async () => {
      try {
        const page = this.pages.get(profileId);
        if (!page || page.isClosed()) {
          this.stopConnectionWatcher(profileId);
          return;
        }

        const status = await this.getStatus(profileId);

        // Detect disconnect - allow re-triggering backup on reconnect
        if (status === 'disconnected') {
          browserLogger.info('Session disconnected - enabling re-backup on reconnect', { profileId });
          this.autoBackupTriggered.delete(profileId);

          if (this.onSessionReady) {
            this.onSessionReady(profileId, 'disconnected');
          }

          // Switch back to fast connection watcher
          clearInterval(interval);
          this.connectionWatchers.delete(profileId);
          this.startConnectionWatcher(profileId);
        }
      } catch (e) {
        this.stopConnectionWatcher(profileId);
      }
    }, 5000); // Check every 5 seconds when connected

    this.connectionWatchers.set(profileId, interval);
  }

  /**
   * Stops the connection watcher for a profile
   */
  private stopConnectionWatcher(profileId: string) {
    const interval = this.connectionWatchers.get(profileId);
    if (interval) {
      clearInterval(interval);
      this.connectionWatchers.delete(profileId);
    }
  }

  // startAutoSave is no longer needed with persistent context
  async startAutoSave(profileId: string, sessionPath: string) {
    // No-op or removed
    console.log(`Auto-save is not needed for persistent context sessions (${profileId}).`);
  }

  stopAutoSave(profileId: string) {
    if (this.autoSaveIntervals.has(profileId)) {
      clearInterval(this.autoSaveIntervals.get(profileId)!);
      this.autoSaveIntervals.delete(profileId);
    }
  }

  async startScreencast(profileId: string, onFrame: (buffer: Buffer) => void): Promise<boolean> {
    if (this.screencastIntervals.has(profileId)) return true;

    console.log(`Starting screencast for ${profileId}`);
    const page = this.pages.get(profileId);
    if (!page) {
      console.error(`No page found for ${profileId} - cannot start screencast`);
      return false;
    }

    // Try to take an initial screenshot to verify page is working
    try {
      const testBuffer = await page.screenshot({ type: 'jpeg', quality: 50 });
      console.log(`Initial screenshot successful for ${profileId}, size: ${testBuffer.length}`);
      onFrame(testBuffer); // Send first frame immediately
    } catch (e) {
      console.error(`Failed to take initial screenshot for ${profileId}:`, e);
      return false;
    }

    const interval = setInterval(async () => {
      try {
        if (!page.isClosed()) {
          const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });
          onFrame(buffer);
        } else {
          console.log(`Page closed for ${profileId}, stopping screencast`);
          clearInterval(interval);
          this.screencastIntervals.delete(profileId);
        }
      } catch (e) {
        console.error(`Screencast error for ${profileId}`, e);
      }
    }, 100); // 10 FPS

    this.screencastIntervals.set(profileId, interval);
    return true;
  }

  stopScreencast(profileId: string) {
    if (this.screencastIntervals.has(profileId)) {
      clearInterval(this.screencastIntervals.get(profileId)!);
      this.screencastIntervals.delete(profileId);
    }
  }

  async getStatus(profileId: string): Promise<'connected' | 'disconnected' | 'connecting'> {
    const page = this.pages.get(profileId);
    if (!page || page.isClosed()) return 'disconnected';

    try {
      // Check for Chat List (Connected)
      const isConnected = await page.evaluate(() => {
        return !!document.querySelector('div[aria-label="Chat list"]');
      });
      if (isConnected) return 'connected';

      // Check for QR Code (Disconnected/Waiting)
      const isWaitingForScan = await page.evaluate(() => {
        return !!document.querySelector('canvas[aria-label="Scan this QR code"]');
      });
      if (isWaitingForScan) return 'disconnected';

      // Check for Loading/Intro
      const isIntro = await page.evaluate(() => {
        return !!document.querySelector('div[data-testid="intro-md-beta-logo-dark"]');
      });
      if (isIntro) return 'connecting';

    } catch (e) {
      console.error(`Error getting status for ${profileId}:`, e);
      return 'disconnected';
    }

    return 'connecting';
  }

  async injectInput(profileId: string, event: any) {
    const page = this.pages.get(profileId);
    if (!page) return;

    try {
      switch (event.type) {
        case 'mousemove':
          await page.mouse.move(event.x, event.y);
          break;
        case 'mousedown':
          if (event.x !== undefined && event.y !== undefined) await page.mouse.move(event.x, event.y);
          await page.mouse.down();
          break;
        case 'mouseup':
          if (event.x !== undefined && event.y !== undefined) await page.mouse.move(event.x, event.y);
          await page.mouse.up();
          break;
        case 'click':
          // Deprecated in favor of mousedown/up, but kept for fallback
          await page.mouse.click(event.x, event.y);
          break;
        case 'contextmenu':
          await page.mouse.click(event.x, event.y, { button: 'right' });
          break;
        case 'dblclick':
          await page.mouse.dblclick(event.x, event.y);
          break;
        case 'keydown':
          // console.log(`Key down: ${event.key}`);
          await page.keyboard.down(event.key);
          break;
        case 'keyup':
          await page.keyboard.up(event.key);
          break;
        case 'wheel':
          await page.mouse.wheel(event.deltaX || 0, event.deltaY || 0);
          break;
      }
    } catch (e) {
      console.error(`Input injection error for ${profileId}`, e);
    }
  }

  async getPage(profileId: string): Promise<Page | undefined> {
    return this.pages.get(profileId);
  }

  getScraper(profileId: string): Scraper | undefined {
    return this.scrapers.get(profileId);
  }

  async getScreenshot(profileId: string): Promise<Buffer | null> {
    console.log(`Getting screenshot for ${profileId}`);
    const page = this.pages.get(profileId);
    if (!page) {
      console.log(`Page not found for ${profileId}. Available pages: ${Array.from(this.pages.keys()).join(', ')}`);
      return null;
    }
    try {
      // console.log(`Taking screenshot for ${profileId}...`);
      return await page.screenshot();
    } catch (e) {
      console.error(`Failed to take screenshot for ${profileId}`, e);
      return null;
    }
  }

  async closeContext(profileId: string) {
    this.stopAutoSave(profileId);
    this.stopConnectionWatcher(profileId);
    this.autoBackupTriggered.delete(profileId);
    const context = this.contexts.get(profileId);
    if (context) {
      await context.close();
      this.contexts.delete(profileId);
      this.pages.delete(profileId);
      this.scrapers.delete(profileId);
    }
  }

  async saveSession(profileId: string, sessionPath: string) {
    const context = this.contexts.get(profileId);
    if (context) {
      try {
        await context.storageState({ path: sessionPath });
        // console.log(`Session saved for ${profileId}`);
      } catch (e) {
        console.error(`Failed to save session for ${profileId}`, e);
      }
    }
  }

  /**
   * Check if a browser context exists for a profile
   */
  hasContext(profileId: string): boolean {
    return this.contexts.has(profileId);
  }

  /**
   * Get health status of the browser manager
   */
  getHealthStatus(): { healthy: boolean; activeSessions: number; activePages: number } {
    return {
      healthy: true, // Browser is always "healthy" since we use persistent contexts
      activeSessions: this.contexts.size,
      activePages: this.pages.size
    };
  }

  /**
   * Check if a session is healthy (page responsive, not crashed)
   */
  async isSessionHealthy(profileId: string): Promise<boolean> {
    const page = this.pages.get(profileId);
    if (!page) return false;

    try {
      // Try to evaluate something simple to check if page is responsive
      await page.evaluate(() => true, { timeout: 5000 });
      return !page.isClosed();
    } catch (e) {
      browserLogger.warn('Session health check failed', { profileId, error: e });
      return false;
    }
  }

  /**
   * Recover a crashed or unresponsive session
   * @param profileId The profile ID to recover
   * @param profileName The profile name for logging
   * @returns true if recovery was successful
   */
  async recoverSession(profileId: string, profileName: string): Promise<boolean> {
    browserLogger.info('Attempting session recovery', { profileId, profileName });
    logEvent.browserCrash(profileId);

    try {
      // Clean up the old session first
      await this.cleanupSession(profileId);

      // Small delay before recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reinitialize the session
      await this.initSession(profileId, profileName);

      // Verify the new session is healthy
      const healthy = await this.isSessionHealthy(profileId);

      logEvent.browserRecover(profileId, healthy);

      if (healthy) {
        browserLogger.info('Session recovery successful', { profileId });
      } else {
        browserLogger.error('Session recovery failed - session unhealthy', { profileId });
      }

      return healthy;
    } catch (error) {
      browserLogger.error('Session recovery failed', { profileId, error });
      logEvent.browserRecover(profileId, false);
      return false;
    }
  }

  /**
   * Clean up a session without full context close (for recovery)
   */
  private async cleanupSession(profileId: string) {
    this.stopAutoSave(profileId);
    this.stopScreencast(profileId);
    this.stopConnectionWatcher(profileId);
    this.autoBackupTriggered.delete(profileId);

    const context = this.contexts.get(profileId);
    if (context) {
      try {
        await context.close();
      } catch (e) {
        // Ignore errors during cleanup - context may already be crashed
        browserLogger.debug('Context close error during cleanup (expected if crashed)', { profileId });
      }
    }

    this.contexts.delete(profileId);
    this.pages.delete(profileId);
    this.scrapers.delete(profileId);
  }

  /**
   * Auto-recover unhealthy sessions (can be called periodically)
   */
  async autoRecoverUnhealthySessions(getProfileName: (id: string) => Promise<string | null>): Promise<{
    checked: number;
    recovered: number;
    failed: string[];
  }> {
    const results = {
      checked: 0,
      recovered: 0,
      failed: [] as string[]
    };

    for (const profileId of this.contexts.keys()) {
      results.checked++;

      const healthy = await this.isSessionHealthy(profileId);
      if (!healthy) {
        browserLogger.warn('Unhealthy session detected', { profileId });

        const profileName = await getProfileName(profileId);
        if (profileName) {
          const recovered = await this.recoverSession(profileId, profileName);
          if (recovered) {
            results.recovered++;
          } else {
            results.failed.push(profileId);
          }
        } else {
          browserLogger.error('Cannot recover - profile not found', { profileId });
          results.failed.push(profileId);
        }
      }
    }

    if (results.checked > 0) {
      browserLogger.info('Auto-recovery check complete', results);
    }

    return results;
  }

  /**
   * Handle page crash event
   */
  private setupCrashHandler(page: Page, profileId: string, profileName: string) {
    page.on('crash', async () => {
      browserLogger.error('Page crashed!', { profileId });
      logEvent.browserCrash(profileId);

      // Attempt automatic recovery
      setTimeout(async () => {
        browserLogger.info('Attempting automatic crash recovery', { profileId });
        await this.recoverSession(profileId, profileName);
      }, 2000);
    });

    page.on('close', () => {
      browserLogger.debug('Page closed', { profileId });
    });
  }

  async closeAll() {
    // Stop all screencasts
    for (const profileId of this.screencastIntervals.keys()) {
      this.stopScreencast(profileId);
    }

    // Stop all auto-saves
    for (const profileId of this.autoSaveIntervals.keys()) {
      this.stopAutoSave(profileId);
    }

    // Stop all connection watchers
    for (const profileId of this.connectionWatchers.keys()) {
      this.stopConnectionWatcher(profileId);
    }
    this.autoBackupTriggered.clear();

    // Close all contexts
    for (const [profileId, context] of this.contexts) {
      try {
        await context.close();
        console.log(`Closed context for ${profileId}`);
      } catch (e) {
        console.error(`Error closing context for ${profileId}`, e);
      }
    }

    this.contexts.clear();
    this.pages.clear();
    this.scrapers.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserManager = new BrowserManager();
