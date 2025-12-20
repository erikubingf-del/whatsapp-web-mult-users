import { Page } from 'playwright';

export interface Message {
    sender: string;
    body: string;
    timestamp: string;
    isIncoming: boolean;
    mediaUrl?: string | null;
    mediaType?: string | null;
}

// New interfaces for IndexedDB extraction
export interface ExtractedChat {
    id: string;
    name: string;
    isGroup: boolean;
    unreadCount: number;
    timestamp: number;
    lastMessage?: string;
}

export interface ExtractedMessage {
    id: string;
    chatId: string;
    body: string;
    timestamp: number;
    fromMe: boolean;
    type: string;
    hasMedia: boolean;
    mediaType?: string;
    mediaUrl?: string;
    directPath?: string;
    mediaKey?: string;
    caption?: string;
    author?: string;
    quotedMsgId?: string;
}

export interface ExtractedContact {
    id: string;
    name: string;
    phoneNumber?: string;
    isMyContact: boolean;
}

export interface ExtractedData {
    chats: ExtractedChat[];
    messages: ExtractedMessage[];
    contacts: ExtractedContact[];
    extractionTime: number;
    success: boolean;
    error?: string;
}

export class Scraper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Scrolls the chat list to load more chats.
     * @param limit Number of pixels to scroll or 'bottom'
     */
    async scrollChatList(limit: number | 'bottom' = 1000) {
        console.log('Scrolling chat list...');
        const chatListSelector = 'div[aria-label="Chat list"]'; // WhatsApp Web specific

        try {
            await this.page.waitForSelector(chatListSelector, { timeout: 5000 });

            await this.page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.scrollTop += 1000; // Scroll down
                }
            }, chatListSelector);

            console.log('Scrolled chat list.');
        } catch (e) {
            console.error('Failed to scroll chat list', e);
        }
    }

    /**
     * Selects a chat by name (exact match for now).
     */
    async selectChat(chatName: string) {
        console.log(`Selecting chat: ${chatName}`);
        try {
            // This is a simplified selector strategy. 
            // In reality, we might need to iterate over list items.
            const chatSelector = `span[title="${chatName}"]`;
            await this.page.click(chatSelector);
            await this.page.waitForSelector('div[data-testid="conversation-panel-messages"]', { timeout: 10000 });
            console.log(`Chat ${chatName} selected.`);
        } catch (e) {
            console.error(`Failed to select chat ${chatName}`, e);
            throw e;
        }
    }

    /**
     * Parses visible messages from the current chat view.
     */
    async parseMessages(): Promise<Message[]> {
        return this.page.evaluate(async () => {
            const messages: any[] = [];

            // Strategy 1: Standard msg-container
            let nodes = Array.from(document.querySelectorAll('div[data-testid="msg-container"]'));

            // Strategy 2: Role="row" (fallback)
            if (nodes.length === 0) {
                nodes = Array.from(document.querySelectorAll('div[role="row"]'));
            }

            // Strategy 3: Class-based (fallback)
            if (nodes.length === 0) {
                nodes = Array.from(document.querySelectorAll('div._ak8k'));
            }

            for (const node of nodes) {
                try {
                    // Determine sender
                    const isOutgoing = node.querySelector('div[data-testid="msg-meta"]')?.parentElement?.classList.contains('message-out')
                        || node.classList.contains('message-out')
                        || !!node.querySelector('span[aria-label="You:"]');

                    const sender = isOutgoing ? 'Me' : 'Client';
                    const isIncoming = !isOutgoing; // Explicitly set isIncoming

                    // Text Content
                    let body = '';
                    const textNode = node.querySelector('span[dir="ltr"]') || node.querySelector('span._ao3e');
                    if (textNode) body = textNode.textContent || '';

                    // Image Content
                    let mediaUrl = null;
                    let mediaType = null;
                    const imgNode = node.querySelector('img');
                    if (imgNode && imgNode.src && imgNode.src.startsWith('blob:')) {
                        // We can't fetch blob directly here easily without more complex logic
                        // But we can try to get it as base64
                        try {
                            const blob = await fetch(imgNode.src).then(r => r.blob());
                            const reader = new FileReader();
                            await new Promise((resolve) => {
                                reader.onload = resolve;
                                reader.readAsDataURL(blob);
                            });
                            mediaUrl = reader.result as string; // Base64 string
                            mediaType = 'image';
                        } catch (e) {
                            console.error('Failed to fetch image blob', e);
                        }
                    }

                    // Timestamp
                    let timestamp = '';
                    const timeNode = node.querySelector('div[data-testid="msg-meta"]') || node.querySelector('div._am-i');
                    if (timeNode) timestamp = timeNode.textContent || '';

                    if (body || mediaUrl) {
                        messages.push({ sender, body, timestamp, isIncoming, mediaUrl, mediaType });
                    }
                } catch (e) {
                    console.error('Error parsing message node', e);
                }
            }
            return messages;
        });
    }

    async loadHistory(limit = 5) {
        return this.page.evaluate(async (limit) => {
            // Find the scrollable container. It's usually the parent of the message list.
            // We can find a message and traverse up.
            const msgNode = document.querySelector('div[data-testid="msg-container"]')
                || document.querySelector('div[role="row"]')
                || document.querySelector('div._ak8k');

            if (!msgNode) return;

            // The scrollable container is usually the one with overflow-y: scroll/auto
            // Let's traverse up until we find it
            let container = msgNode.parentElement;
            while (container && window.getComputedStyle(container).overflowY !== 'scroll' && window.getComputedStyle(container).overflowY !== 'auto') {
                container = container.parentElement;
                if (!container || container.tagName === 'BODY') return;
            }

            if (container) {
                for (let i = 0; i < limit; i++) {
                    const previousHeight = container.scrollHeight;
                    container.scrollTop = 0;
                    // Wait for loading spinner or just a delay
                    await new Promise(r => setTimeout(r, 1500));

                    // If height didn't change, we might be at the top
                    if (container.scrollHeight === previousHeight) {
                        // Try one more time just in case
                        await new Promise(r => setTimeout(r, 1000));
                        if (container.scrollHeight === previousHeight) break;
                    }
                }
            }
        }, limit);
    }

    async scrapeAllChats(onProgress: (current: number, total: number, chatName: string) => void) {
        // 1. Get all chat items
        const chatSelector = 'div[aria-label="Chat list"] > div > div';

        const chatCount = await this.page.evaluate((sel) => {
            return document.querySelectorAll(sel).length;
        }, chatSelector);

        console.log(`Found ${chatCount} chats`);

        const results = [];

        for (let i = 0; i < chatCount; i++) {
            // Re-query elements each time because DOM might change after click
            const chatName = await this.page.evaluate(async ({ index, sel }: { index: number, sel: string }) => {
                const items = document.querySelectorAll(sel);
                const item = items[index] as HTMLElement;
                if (item) {
                    // Click to open
                    item.click();
                    // Wait for load
                    await new Promise(r => setTimeout(r, 1000));

                    // Get name
                    const titleNode = item.querySelector('span[dir="auto"]');
                    return titleNode ? titleNode.textContent : 'Unknown';
                }
                return null;
            }, { index: i, sel: chatSelector });

            if (chatName) {
                onProgress(i + 1, chatCount, chatName);

                // Load History (Scroll Up)
                await this.loadHistory(3); // Scroll up 3 times by default

                // Parse messages
                const messages = await this.parseMessages();
                results.push({ chatName, messages });
            }
        }

        return results;
    }

    // ============================================
    // BULLETPROOF BACKUP: IndexedDB Extraction
    // ============================================

    /**
     * Extracts ALL data directly from WhatsApp's IndexedDB
     * This is 10x faster and more reliable than DOM scraping
     */
    async extractAllData(): Promise<ExtractedData> {
        const startTime = Date.now();
        console.log('Starting IndexedDB extraction...');

        try {
            const data = await this.page.evaluate(async () => {
                // Helper function to get all records from an IndexedDB store
                const getAllFromStore = (db: IDBDatabase, storeName: string): Promise<any[]> => {
                    return new Promise((resolve) => {
                        try {
                            const tx = db.transaction(storeName, 'readonly');
                            const store = tx.objectStore(storeName);
                            const request = store.getAll();
                            request.onsuccess = () => resolve(request.result || []);
                            request.onerror = () => resolve([]);
                        } catch (e) {
                            resolve([]);
                        }
                    });
                };

                // First, discover all available databases
                const discoverDatabases = async (): Promise<string[]> => {
                    try {
                        // Modern browsers support indexedDB.databases()
                        if ('databases' in indexedDB) {
                            const dbs = await (indexedDB as any).databases();
                            console.log('[Backup] All available IndexedDB databases:', dbs.map((d: any) => d.name));
                            return dbs.map((d: any) => d.name).filter(Boolean);
                        }
                    } catch (e) {
                        console.log('[Backup] Could not enumerate databases:', e);
                    }
                    // Fallback to known names
                    return ['wawc', 'model-storage', 'wawc_db_enc', 'WaWebSessionStorage'];
                };

                const availableDbNames = await discoverDatabases();
                console.log('[Backup] Discovered databases:', availableDbNames);

                // Try to open WhatsApp's IndexedDB (name may vary between versions)
                const openDB = (): Promise<{ db: IDBDatabase; dbName: string } | null> => {
                    return new Promise((resolve) => {
                        // Prioritize likely WhatsApp database names
                        const dbNames = [...new Set([
                            ...availableDbNames.filter(n =>
                                n.toLowerCase().includes('wa') ||
                                n.toLowerCase().includes('whatsapp') ||
                                n === 'model-storage'
                            ),
                            'wawc',
                            'model-storage',
                            'wawc_db_enc',
                            'WaWebSessionStorage',
                            ...availableDbNames
                        ])];

                        console.log('[Backup] Will try databases in order:', dbNames);
                        let tried = 0;

                        const tryNext = () => {
                            if (tried >= dbNames.length) {
                                console.log('[Backup] No suitable database found after trying all options');
                                resolve(null);
                                return;
                            }

                            const dbName = dbNames[tried];
                            tried++;

                            try {
                                console.log(`[Backup] Trying database: ${dbName}`);
                                const request = indexedDB.open(dbName);
                                request.onerror = (e) => {
                                    console.log(`[Backup] Failed to open ${dbName}:`, e);
                                    tryNext();
                                };
                                request.onsuccess = () => {
                                    const db = request.result;
                                    // Get all store names
                                    const storeNames = Array.from(db.objectStoreNames);
                                    console.log(`[Backup] Database ${dbName} stores:`, storeNames);

                                    // Check if it has relevant stores
                                    if (storeNames.some(name =>
                                        name.toLowerCase().includes('chat') ||
                                        name.toLowerCase().includes('message') ||
                                        name.toLowerCase().includes('msg') ||
                                        name.toLowerCase().includes('conversation')
                                    )) {
                                        console.log(`[Backup] Found suitable database: ${dbName}`);
                                        resolve({ db, dbName });
                                    } else {
                                        console.log(`[Backup] Database ${dbName} has no chat/message stores, trying next`);
                                        db.close();
                                        tryNext();
                                    }
                                };
                            } catch (e) {
                                console.log(`[Backup] Error opening ${dbName}:`, e);
                                tryNext();
                            }
                        };

                        tryNext();
                    });
                };

                const dbResult = await openDB();
                if (!dbResult) {
                    // Log all databases for debugging
                    console.log('[Backup] FAILED - Could not find any WhatsApp IndexedDB');
                    return {
                        chats: [],
                        messages: [],
                        contacts: [],
                        success: false,
                        error: `Could not find WhatsApp IndexedDB. Available: ${availableDbNames.join(', ')}`
                    };
                }

                const { db, dbName } = dbResult;

                // Get all available store names
                const storeNames = Array.from(db.objectStoreNames);
                console.log(`[Backup] Using database: ${dbName}, stores:`, storeNames);

                // Find the right store names (they can vary) - be more flexible with matching
                const chatStoreName = storeNames.find(n =>
                    n.toLowerCase() === 'chat' ||
                    n.toLowerCase().includes('chat') ||
                    n.toLowerCase().includes('conversation')
                ) || 'chat';

                const messageStoreName = storeNames.find(n =>
                    n.toLowerCase() === 'message' ||
                    n.toLowerCase().includes('message') ||
                    n.toLowerCase().includes('msg')
                ) || 'message';

                const contactStoreName = storeNames.find(n =>
                    n.toLowerCase() === 'contact' ||
                    n.toLowerCase().includes('contact')
                ) || 'contact';

                console.log(`[Backup] Store names - chat: ${chatStoreName}, message: ${messageStoreName}, contact: ${contactStoreName}`);

                // Extract raw data with existence checks
                const rawChats = storeNames.some(s => s.toLowerCase() === chatStoreName.toLowerCase())
                    ? await getAllFromStore(db, chatStoreName) : [];
                const rawMessages = storeNames.some(s => s.toLowerCase() === messageStoreName.toLowerCase())
                    ? await getAllFromStore(db, messageStoreName) : [];
                const rawContacts = storeNames.some(s => s.toLowerCase() === contactStoreName.toLowerCase())
                    ? await getAllFromStore(db, contactStoreName) : [];

                console.log(`[Backup] Raw counts - chats: ${rawChats.length}, messages: ${rawMessages.length}, contacts: ${rawContacts.length}`);

                db.close();

                // Transform chats
                const chats = rawChats.map((chat: any) => {
                    const id = chat.id?._serialized || chat.id || String(chat.jid) || '';
                    return {
                        id,
                        name: chat.name || chat.formattedTitle || chat.contact?.name ||
                              chat.contact?.pushname || chat.displayName || id.split('@')[0] || 'Unknown',
                        isGroup: chat.isGroup || id.includes('@g.us') || false,
                        unreadCount: chat.unreadCount || 0,
                        timestamp: chat.t || chat.timestamp || chat.conversationTimestamp || 0,
                        lastMessage: chat.lastReceivedKey?.id || ''
                    };
                }).filter((c: any) => c.id && c.id.length > 0);

                // Transform messages
                const messages = rawMessages.map((msg: any) => {
                    // Extract chat ID from various possible locations
                    const chatId = msg.id?.remote?._serialized ||
                                   msg.from?._serialized ||
                                   msg.to?._serialized ||
                                   msg.chatId?._serialized ||
                                   msg.chatId ||
                                   msg.key?.remoteJid ||
                                   '';

                    // Extract message ID
                    const msgId = msg.id?._serialized ||
                                  msg.id?.id ||
                                  msg.key?.id ||
                                  `${msg.t || Date.now()}_${chatId}`;

                    return {
                        id: msgId,
                        chatId,
                        body: msg.body || msg.text || msg.caption || msg.content || '',
                        timestamp: msg.t || msg.timestamp || msg.messageTimestamp || 0,
                        fromMe: msg.id?.fromMe ?? msg.fromMe ?? msg.key?.fromMe ?? false,
                        type: msg.type || msg.messageType || 'chat',
                        hasMedia: msg.hasMedia || !!msg.mediaKey || !!msg.directPath || msg.type === 'image' || msg.type === 'video',
                        mediaType: msg.mimetype || (msg.type !== 'chat' ? msg.type : undefined),
                        mediaUrl: msg.deprecatedMms3Url || undefined,
                        directPath: msg.directPath || undefined,
                        mediaKey: msg.mediaKey ? btoa(String.fromCharCode(...new Uint8Array(msg.mediaKey))) : undefined,
                        caption: msg.caption || undefined,
                        author: msg.author?._serialized || msg.participant?._serialized || undefined,
                        quotedMsgId: msg.quotedStanzaID || msg.quotedMsg?.id?._serialized || undefined
                    };
                }).filter((m: any) => m.chatId && (m.body || m.hasMedia));

                // Transform contacts
                const contacts = rawContacts.map((contact: any) => ({
                    id: contact.id?._serialized || contact.id || '',
                    name: contact.name || contact.pushname || contact.formattedName || contact.verifiedName || '',
                    phoneNumber: contact.id?.user || contact.number || undefined,
                    isMyContact: contact.isMyContact || contact.isWAContact || false
                })).filter((c: any) => c.id && c.id.length > 0);

                return {
                    chats,
                    messages,
                    contacts,
                    success: true
                };
            });

            const extractionTime = Date.now() - startTime;
            console.log(`IndexedDB extraction completed in ${extractionTime}ms`);
            console.log(`Found: ${data.chats.length} chats, ${data.messages.length} messages, ${data.contacts.length} contacts`);

            return {
                ...data,
                extractionTime,
                success: data.success !== false
            };

        } catch (error: any) {
            console.error('IndexedDB extraction failed:', error);
            return {
                chats: [],
                messages: [],
                contacts: [],
                extractionTime: Date.now() - startTime,
                success: false,
                error: error.message || 'Unknown extraction error'
            };
        }
    }

    /**
     * Fallback: Try to extract data from WhatsApp's global Store object
     * This works when IndexedDB is not accessible but the page is loaded
     */
    async extractFromGlobalStore(): Promise<ExtractedData | null> {
        console.log('[Backup] Attempting extraction from global Store...');

        try {
            const data = await this.page.evaluate(() => {
                // WhatsApp Web exposes some data on window objects
                const win = window as any;

                console.log('[Backup] Looking for global Store object...');

                // Try different known global objects - WhatsApp has changed these over time
                let Store = null;

                // Method 1: Direct Store object
                if (win.Store) {
                    console.log('[Backup] Found window.Store');
                    Store = win.Store;
                }

                // Method 2: WAPI wrapper
                if (!Store && win.WAPI?.Store) {
                    console.log('[Backup] Found window.WAPI.Store');
                    Store = win.WAPI.Store;
                }

                // Method 3: Webpack chunk (newer WhatsApp versions)
                if (!Store && win.webpackChunkwhatsapp_web_client) {
                    console.log('[Backup] Found webpackChunkwhatsapp_web_client, searching for Store...');
                    try {
                        // Try to find Store in webpack modules
                        for (const chunk of win.webpackChunkwhatsapp_web_client) {
                            if (chunk && chunk[1]) {
                                for (const moduleId in chunk[1]) {
                                    try {
                                        const module = chunk[1][moduleId];
                                        if (module?.default?.Chat || module?.Chat) {
                                            Store = module.default || module;
                                            console.log('[Backup] Found Store in webpack chunk');
                                            break;
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                            }
                            if (Store) break;
                        }
                    } catch (e) {
                        console.log('[Backup] Error searching webpack chunks:', e);
                    }
                }

                // Method 4: Search window for any object with Chat property
                if (!Store) {
                    console.log('[Backup] Searching window for objects with Chat property...');
                    for (const key of Object.keys(win)) {
                        try {
                            if (win[key] && typeof win[key] === 'object' && win[key].Chat) {
                                Store = win[key];
                                console.log(`[Backup] Found potential Store at window.${key}`);
                                break;
                            }
                        } catch (e) { /* ignore */ }
                    }
                }

                if (!Store) {
                    console.log('[Backup] Global Store not found - all methods exhausted');
                    return null;
                }

                try {
                    // Try to get chats from Store
                    console.log('[Backup] Store.Chat:', Store.Chat ? 'exists' : 'missing');

                    const chatModels = Store.Chat?.getModelsArray?.() ||
                                       Store.Chat?.models ||
                                       Store.Chat?._models ||
                                       (Array.isArray(Store.Chat) ? Store.Chat : []);

                    console.log(`[Backup] Found ${chatModels.length} chat models in Store`);

                    const chats: any[] = [];
                    const messages: any[] = [];

                    for (const chat of chatModels) {
                        const chatId = chat.id?._serialized || chat.id || '';

                        chats.push({
                            id: chatId,
                            name: chat.name || chat.formattedTitle || chat.contact?.name || chat.contact?.pushname || chatId.split('@')[0],
                            isGroup: chat.isGroup || chatId.includes('@g.us'),
                            unreadCount: chat.unreadCount || 0,
                            timestamp: chat.t || chat.timestamp || 0
                        });

                        // Get messages for this chat
                        const chatMsgs = chat.msgs?.getModelsArray?.() ||
                                        chat.msgs?.models ||
                                        chat.msgs?._models ||
                                        chat.messages?.getModelsArray?.() ||
                                        chat.messages?.models ||
                                        [];

                        for (const msg of chatMsgs) {
                            messages.push({
                                id: msg.id?._serialized || msg.id?.id || `${msg.t}_${chatId}`,
                                chatId,
                                body: msg.body || msg.text || msg.caption || '',
                                timestamp: msg.t || msg.timestamp || 0,
                                fromMe: msg.id?.fromMe ?? msg.fromMe ?? false,
                                type: msg.type || 'chat',
                                hasMedia: msg.hasMedia || !!msg.mediaData || false
                            });
                        }
                    }

                    console.log(`[Backup] Store extraction result - chats: ${chats.length}, messages: ${messages.length}`);

                    return {
                        chats,
                        messages,
                        contacts: [],
                        success: true
                    };
                } catch (e) {
                    console.error('[Backup] Error extracting from Store:', e);
                    return null;
                }
            });

            if (data) {
                console.log(`[Backup] Global Store extraction: ${data.chats.length} chats, ${data.messages.length} messages`);
            }

            return data ? {
                ...data,
                extractionTime: 0,
                success: true
            } : null;

        } catch (error: any) {
            console.error('[Backup] Global Store extraction failed:', error);
            return null;
        }
    }

    /**
     * Combined extraction: tries IndexedDB first, then falls back to global Store
     */
    async extractAllDataWithFallback(): Promise<ExtractedData> {
        console.log('[Backup] Starting combined extraction...');

        // Try IndexedDB first (most reliable)
        let data = await this.extractAllData();

        console.log(`[Backup] IndexedDB result - success: ${data.success}, chats: ${data.chats.length}, messages: ${data.messages.length}`);

        // If IndexedDB failed or returned no data, try global Store
        if (!data.success || (data.chats.length === 0 && data.messages.length === 0)) {
            console.log('[Backup] IndexedDB extraction incomplete, trying global Store fallback...');
            const fallbackData = await this.extractFromGlobalStore();

            if (fallbackData && (fallbackData.chats.length > 0 || fallbackData.messages.length > 0)) {
                console.log(`[Backup] Global Store fallback succeeded - chats: ${fallbackData.chats.length}, messages: ${fallbackData.messages.length}`);
                data = fallbackData;
            } else {
                console.log('[Backup] Global Store fallback also returned no data');
            }
        }

        // If still no data, the page might not be fully loaded
        if (data.chats.length === 0 && data.messages.length === 0) {
            data.error = data.error || 'No data found - WhatsApp may not be fully loaded or logged in';
            console.log(`[Backup] FINAL RESULT: No data extracted. Error: ${data.error}`);
        } else {
            console.log(`[Backup] FINAL RESULT: Extracted ${data.chats.length} chats and ${data.messages.length} messages`);
        }

        return data;
    }
}
