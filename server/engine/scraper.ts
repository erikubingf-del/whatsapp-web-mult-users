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

                // Try to open WhatsApp's IndexedDB (name may vary between versions)
                const openDB = (): Promise<IDBDatabase | null> => {
                    return new Promise((resolve) => {
                        const dbNames = ['wawc', 'model-storage', 'wawc_db_enc'];
                        let tried = 0;

                        const tryNext = () => {
                            if (tried >= dbNames.length) {
                                resolve(null);
                                return;
                            }

                            const dbName = dbNames[tried];
                            tried++;

                            try {
                                const request = indexedDB.open(dbName);
                                request.onerror = () => tryNext();
                                request.onsuccess = () => {
                                    const db = request.result;
                                    // Verify it has the expected stores
                                    const storeNames = Array.from(db.objectStoreNames);
                                    if (storeNames.some(name =>
                                        name.includes('chat') ||
                                        name.includes('message') ||
                                        name.includes('msg')
                                    )) {
                                        resolve(db);
                                    } else {
                                        db.close();
                                        tryNext();
                                    }
                                };
                            } catch (e) {
                                tryNext();
                            }
                        };

                        tryNext();
                    });
                };

                const db = await openDB();
                if (!db) {
                    return {
                        chats: [],
                        messages: [],
                        contacts: [],
                        success: false,
                        error: 'Could not find WhatsApp IndexedDB'
                    };
                }

                // Get all available store names
                const storeNames = Array.from(db.objectStoreNames);
                console.log('Available IndexedDB stores:', storeNames);

                // Find the right store names (they can vary)
                const chatStoreName = storeNames.find(n => n === 'chat' || n.includes('chat')) || 'chat';
                const messageStoreName = storeNames.find(n => n === 'message' || n.includes('message') || n.includes('msg')) || 'message';
                const contactStoreName = storeNames.find(n => n === 'contact' || n.includes('contact')) || 'contact';

                // Extract raw data
                const rawChats = storeNames.includes(chatStoreName)
                    ? await getAllFromStore(db, chatStoreName) : [];
                const rawMessages = storeNames.includes(messageStoreName)
                    ? await getAllFromStore(db, messageStoreName) : [];
                const rawContacts = storeNames.includes(contactStoreName)
                    ? await getAllFromStore(db, contactStoreName) : [];

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
        console.log('Attempting extraction from global Store...');

        try {
            const data = await this.page.evaluate(() => {
                // WhatsApp Web exposes some data on window objects
                const win = window as any;

                // Try different known global objects
                const Store = win.Store || win.WAPI?.Store || win.webpackChunkwhatsapp_web_client;
                if (!Store) {
                    console.log('Global Store not found');
                    return null;
                }

                try {
                    // Try to get chats from Store
                    const chatModels = Store.Chat?.getModelsArray?.() ||
                                       Store.Chat?.models ||
                                       [];

                    const chats: any[] = [];
                    const messages: any[] = [];

                    for (const chat of chatModels) {
                        const chatId = chat.id?._serialized || chat.id || '';

                        chats.push({
                            id: chatId,
                            name: chat.name || chat.formattedTitle || chat.contact?.name || chatId.split('@')[0],
                            isGroup: chat.isGroup || chatId.includes('@g.us'),
                            unreadCount: chat.unreadCount || 0,
                            timestamp: chat.t || 0
                        });

                        // Get messages for this chat
                        const chatMsgs = chat.msgs?.getModelsArray?.() || chat.msgs?.models || [];
                        for (const msg of chatMsgs) {
                            messages.push({
                                id: msg.id?._serialized || msg.id?.id || '',
                                chatId,
                                body: msg.body || '',
                                timestamp: msg.t || 0,
                                fromMe: msg.id?.fromMe ?? false,
                                type: msg.type || 'chat',
                                hasMedia: msg.hasMedia || false
                            });
                        }
                    }

                    return {
                        chats,
                        messages,
                        contacts: [],
                        success: true
                    };
                } catch (e) {
                    console.error('Error extracting from Store:', e);
                    return null;
                }
            });

            if (data) {
                console.log(`Global Store extraction: ${data.chats.length} chats, ${data.messages.length} messages`);
            }

            return data ? {
                ...data,
                extractionTime: 0,
                success: true
            } : null;

        } catch (error: any) {
            console.error('Global Store extraction failed:', error);
            return null;
        }
    }

    /**
     * Combined extraction: tries IndexedDB first, then falls back to global Store
     */
    async extractAllDataWithFallback(): Promise<ExtractedData> {
        // Try IndexedDB first (most reliable)
        let data = await this.extractAllData();

        // If IndexedDB failed or returned no data, try global Store
        if (!data.success || (data.chats.length === 0 && data.messages.length === 0)) {
            console.log('IndexedDB extraction incomplete, trying global Store fallback...');
            const fallbackData = await this.extractFromGlobalStore();

            if (fallbackData && (fallbackData.chats.length > 0 || fallbackData.messages.length > 0)) {
                data = fallbackData;
            }
        }

        // If still no data, the page might not be fully loaded
        if (data.chats.length === 0 && data.messages.length === 0) {
            data.error = data.error || 'No data found - WhatsApp may not be fully loaded or logged in';
        }

        return data;
    }
}
