'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface Profile {
    id: string;
    name: string;
    phoneNumber?: string;
    isActive: boolean;
    lastScraped?: string;
}

interface Chat {
    id: string;
    name: string;
    updatedAt: string;
    _count: { messages: number };
}

interface Message {
    id: string;
    fromMe: boolean;
    body: string;
    timestamp: string;
    mediaUrl?: string;
    mediaType?: string;
}

interface BackupProgress {
    phase: 'idle' | 'extracting' | 'saving_chats' | 'saving_messages' | 'complete' | 'error';
    current: number;
    total: number;
    message?: string;
    profileName?: string;
    stats?: {
        chatsFound: number;
        chatsSaved: number;
        messagesFound: number;
        messagesSaved: number;
        newMessages: number;
        duplicatesSkipped: number;
    };
}

interface SearchFilters {
    q: string;
    profileId: string;
    fromMe: 'all' | 'true' | 'false';
    dateFrom: string;
    dateTo: string;
    hasMedia: 'all' | 'true' | 'false';
    mediaType: 'all' | 'image' | 'video' | 'audio' | 'document';
}

interface SearchResult {
    id: string;
    body: string;
    timestamp: string;
    fromMe: boolean;
    mediaUrl?: string;
    mediaType?: string;
    chatId: string;
    chatName: string;
    profileName: string;
    profileId: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function GlobalHistoryPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Settings State
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // Backup State
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [backupProgress, setBackupProgress] = useState<BackupProgress>({
        phase: 'idle', current: 0, total: 0
    });
    const [backupResults, setBackupResults] = useState<Array<{
        profileId: string;
        profileName: string;
        success: boolean;
        newMessages: number;
        error?: string;
    }>>([]);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Enhanced Search State
    const [showFilters, setShowFilters] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        q: '',
        profileId: '',
        fromMe: 'all',
        dateFrom: '',
        dateTo: '',
        hasMedia: 'all',
        mediaType: 'all'
    });
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 50, total: 0, totalPages: 0
    });

    // Calculate active filters count
    const activeFiltersCount = [
        searchFilters.profileId,
        searchFilters.fromMe !== 'all',
        searchFilters.dateFrom,
        searchFilters.dateTo,
        searchFilters.hasMedia !== 'all',
        searchFilters.mediaType !== 'all'
    ].filter(Boolean).length;

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial Load
    useEffect(() => {
        fetchProfiles();
        fetchSettings();
    }, []);

    // Fetch settings (logo)
    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setLogoUrl(data.logoUrl || null);
            }
        } catch (e) {
            console.error('Error fetching settings:', e);
        }
    };

    // Fetch profiles
    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/profiles');
            const data = await res.json();
            const profilesList = Array.isArray(data) ? data : (data.profiles || []);
            setProfiles(profilesList);
            if (!selectedProfileId && profilesList.length > 0) {
                setSelectedProfileId(profilesList[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch profiles', e);
        }
    };

    // Fetch chats when profile selected
    useEffect(() => {
        if (selectedProfileId && !searchMode) {
            fetchChats(selectedProfileId);
            setSelectedChatId(null);
            setMessages([]);
        }
    }, [selectedProfileId, searchMode]);

    const fetchChats = async (profileId: string) => {
        try {
            const res = await fetch(`/api/profiles/${profileId}/history`);
            const data = await res.json();
            setChats(data);
        } catch (e) {
            console.error('Failed to fetch chats', e);
        }
    };

    // Fetch messages when chat selected
    useEffect(() => {
        if (selectedChatId) {
            fetchMessages(selectedChatId);
        }
    }, [selectedChatId]);

    const fetchMessages = async (chatId: string) => {
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`);
            const data = await res.json();
            setMessages(data);
        } catch (e) {
            console.error('Failed to fetch messages', e);
        }
    };

    // Enhanced Search Function
    const performSearch = useCallback(async (page: number = 1) => {
        const hasAnyFilter = searchFilters.q || searchFilters.profileId ||
            searchFilters.fromMe !== 'all' || searchFilters.dateFrom ||
            searchFilters.dateTo || searchFilters.hasMedia !== 'all' ||
            searchFilters.mediaType !== 'all';

        if (!hasAnyFilter) {
            setSearchMode(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchMode(true);

        try {
            const params = new URLSearchParams();
            if (searchFilters.q) params.set('q', searchFilters.q);
            if (searchFilters.profileId) params.set('profileId', searchFilters.profileId);
            if (searchFilters.fromMe !== 'all') params.set('fromMe', searchFilters.fromMe);
            if (searchFilters.dateFrom) params.set('dateFrom', searchFilters.dateFrom);
            if (searchFilters.dateTo) params.set('dateTo', searchFilters.dateTo);
            if (searchFilters.hasMedia !== 'all') params.set('hasMedia', searchFilters.hasMedia);
            if (searchFilters.mediaType !== 'all') params.set('mediaType', searchFilters.mediaType);
            params.set('page', String(page));
            params.set('limit', '50');

            const res = await fetch(`/api/search?${params.toString()}`);
            const data = await res.json();

            setSearchResults(data.results || []);
            setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setIsSearching(false);
        }
    }, [searchFilters]);

    // Debounced search on text input
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchFilters.q.length >= 2 || activeFiltersCount > 0) {
                performSearch(1);
            } else if (!searchFilters.q && activeFiltersCount === 0) {
                setSearchMode(false);
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchFilters.q, performSearch, activeFiltersCount]);

    // Clear all filters
    const clearFilters = () => {
        setSearchFilters({
            q: '',
            profileId: '',
            fromMe: 'all',
            dateFrom: '',
            dateTo: '',
            hasMedia: 'all',
            mediaType: 'all'
        });
        setSearchMode(false);
        setSearchResults([]);
    };

    // Handle filter change
    const updateFilter = (key: keyof SearchFilters, value: string) => {
        setSearchFilters(prev => ({ ...prev, [key]: value }));
    };

    // Apply filters button handler
    const handleApplyFilters = () => {
        performSearch(1);
        setShowFilters(false);
    };

    const handleRenameProfile = async (id: string, newName: string) => {
        try {
            await fetch(`/api/profiles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            fetchProfiles();
            setEditingProfileId(null);
        } catch (e) {
            console.error('Failed to rename', e);
        }
    };

    const handleGlobalBackup = async () => {
        setIsBackingUp(true);
        setShowBackupModal(true);
        setBackupResults([]);
        setBackupProgress({
            phase: 'extracting',
            current: 0,
            total: profiles.length,
            message: 'Starting backup...'
        });

        const results: typeof backupResults = [];

        for (let i = 0; i < profiles.length; i++) {
            const profile = profiles[i];
            setBackupProgress({
                phase: 'extracting',
                current: i + 1,
                total: profiles.length,
                profileName: profile.name,
                message: `Backing up ${profile.name}...`
            });

            try {
                const res = await fetch(`/api/profiles/${profile.id}/scrape`, { method: 'POST' });
                const data = await res.json();

                results.push({
                    profileId: profile.id,
                    profileName: profile.name,
                    success: data.success !== false,
                    newMessages: data.stats?.newMessages || data.savedCount || 0,
                    error: data.error
                });

                if (data.stats) {
                    setBackupProgress(prev => ({ ...prev, stats: data.stats }));
                }
            } catch (e) {
                console.error(`Failed to backup ${profile.name}`, e);
                results.push({
                    profileId: profile.id,
                    profileName: profile.name,
                    success: false,
                    newMessages: 0,
                    error: 'Network error'
                });
            }
        }

        setBackupResults(results);
        const totalNew = results.reduce((sum, r) => sum + r.newMessages, 0);
        setBackupProgress({
            phase: 'complete',
            current: profiles.length,
            total: profiles.length,
            message: `Backup complete! ${totalNew} new messages saved.`
        });
        setIsBackingUp(false);
        if (selectedProfileId) fetchChats(selectedProfileId);
    };

    const handleSingleBackup = async (profileId: string, profileName: string) => {
        setIsBackingUp(true);
        setShowBackupModal(true);
        setBackupResults([]);
        setBackupProgress({
            phase: 'extracting',
            current: 0,
            total: 1,
            profileName,
            message: `Starting backup for ${profileName}...`
        });

        try {
            const res = await fetch(`/api/profiles/${profileId}/scrape`, { method: 'POST' });
            const data = await res.json();

            setBackupResults([{
                profileId,
                profileName,
                success: data.success !== false,
                newMessages: data.stats?.newMessages || data.savedCount || 0,
                error: data.error
            }]);

            setBackupProgress({
                phase: 'complete',
                current: 1,
                total: 1,
                profileName,
                message: data.success !== false
                    ? `Backup complete! ${data.stats?.newMessages || 0} new messages.`
                    : `Backup failed: ${data.error}`,
                stats: data.stats
            });
        } catch (e) {
            setBackupProgress({
                phase: 'error',
                current: 0,
                total: 1,
                profileName,
                message: 'Network error during backup'
            });
        }

        setIsBackingUp(false);
        if (selectedProfileId === profileId) fetchChats(profileId);
    };

    const closeBackupModal = () => {
        if (!isBackingUp) {
            setShowBackupModal(false);
            setBackupProgress({ phase: 'idle', current: 0, total: 0 });
        }
    };

    return (
        <div className="flex h-screen bg-[#0A192F] text-slate-300 font-sans overflow-hidden">
            {/* Navigation Rail */}
            <div className="w-16 bg-[#050c18] border-r border-slate-800/50 flex flex-col items-center py-6 gap-6 z-30">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white cursor-pointer transition-transform hover:scale-105" onClick={() => router.push('/')}>
                    <span className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white cursor-pointer transition-transform hover:scale-105">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all" onClick={() => router.push('/analytics')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all" onClick={() => router.push('/settings')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </div>

                {/* User Avatar - pushed to bottom */}
                <div className="mt-auto relative" ref={userMenuRef}>
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-transform hover:scale-105 shadow-lg shadow-purple-500/20"
                    >
                        {session?.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </button>

                    {/* User Menu Popup */}
                    {userMenuOpen && (
                        <div className="absolute bottom-14 left-0 w-64 bg-[#112240] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {/* User Info Header */}
                            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                                        {session?.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-white truncate">{session?.user?.name || 'User'}</div>
                                        <div className="text-xs text-slate-400 truncate">{session?.user?.email}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        router.push('/settings');
                                        setUserMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                                    Settings
                                </button>
                                {(session?.user as any)?.hasPassword && (
                                    <button
                                        onClick={() => {
                                            router.push('/change-password');
                                            setUserMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        Change Password
                                    </button>
                                )}
                                <div className="my-2 border-t border-slate-700/50" />
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pane 1: Profiles & Search */}
            <div className="w-72 bg-[#0d1b33] flex flex-col border-r border-slate-800/50">
                <div className="p-4 border-b border-slate-800/50">
                    <h2 className="font-bold text-slate-100 mb-4">Message Search</h2>

                    {/* Search Input with Filter Toggle */}
                    <div className="mb-3 relative">
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchFilters.q}
                            onChange={(e) => updateFilter('q', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 pl-9 pr-10"
                        />
                        <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`absolute right-2 top-1.5 p-1 rounded transition-colors ${showFilters || activeFiltersCount > 0 ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-3 space-y-3">
                            {/* Profile Filter */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Phone / Profile</label>
                                <select
                                    value={searchFilters.profileId}
                                    onChange={(e) => updateFilter('profileId', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                >
                                    <option value="">All Phones</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sender Filter */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Sender</label>
                                <select
                                    value={searchFilters.fromMe}
                                    onChange={(e) => updateFilter('fromMe', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                >
                                    <option value="all">All Messages</option>
                                    <option value="true">Sent by Me</option>
                                    <option value="false">Received</option>
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">From Date</label>
                                    <input
                                        type="date"
                                        value={searchFilters.dateFrom}
                                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">To Date</label>
                                    <input
                                        type="date"
                                        value={searchFilters.dateTo}
                                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                    />
                                </div>
                            </div>

                            {/* Media Filter */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Media</label>
                                <select
                                    value={searchFilters.hasMedia}
                                    onChange={(e) => updateFilter('hasMedia', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                >
                                    <option value="all">All Messages</option>
                                    <option value="true">With Media Only</option>
                                    <option value="false">Text Only</option>
                                </select>
                            </div>

                            {/* Media Type */}
                            {searchFilters.hasMedia === 'true' && (
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Media Type</label>
                                    <select
                                        value={searchFilters.mediaType}
                                        onChange={(e) => updateFilter('mediaType', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="image">Images</option>
                                        <option value="video">Videos</option>
                                        <option value="audio">Audio</option>
                                        <option value="document">Documents</option>
                                    </select>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleApplyFilters}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium py-2 rounded transition-colors"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium py-2 rounded transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Search Status / Results Count */}
                    {searchMode && (
                        <div className="flex items-center justify-between text-xs mb-3">
                            <span className="text-slate-400">
                                {isSearching ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                        Searching...
                                    </span>
                                ) : (
                                    `${pagination.total} results found`
                                )}
                            </span>
                            {!isSearching && searchMode && (
                                <button onClick={clearFilters} className="text-cyan-400 hover:text-cyan-300">
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Backup Button */}
                    <button
                        onClick={handleGlobalBackup}
                        disabled={isBackingUp}
                        className={`w-full py-2 px-3 rounded-lg font-medium text-xs transition-all ${isBackingUp
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                        }`}
                    >
                        {isBackingUp ? 'Backing Up...' : 'Backup All Phones'}
                    </button>
                </div>

                {/* Profiles List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <div className="text-xs text-slate-500 uppercase tracking-wider px-2 py-2">Connected Phones</div>
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            onClick={() => {
                                clearFilters();
                                setSelectedProfileId(profile.id);
                            }}
                            className={`group p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${selectedProfileId === profile.id && !searchMode
                                ? 'bg-slate-800 border border-slate-700 text-white'
                                : 'hover:bg-slate-800/50 text-slate-400'
                            }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <svg className={`w-4 h-4 ${selectedProfileId === profile.id && !searchMode ? 'text-cyan-400' : 'text-slate-600'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                {editingProfileId === profile.id ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleRenameProfile(profile.id, editName)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameProfile(profile.id, editName)}
                                        autoFocus
                                        className="bg-slate-900 text-white text-sm px-1 rounded w-full outline-none border border-cyan-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-sm font-medium truncate">{profile.name}</span>
                                )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSingleBackup(profile.id, profile.name); }}
                                    disabled={isBackingUp}
                                    className="p-1 hover:bg-green-700 rounded text-slate-500 hover:text-white transition-all"
                                    title="Backup"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); setEditName(profile.name); }}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-all"
                                    title="Rename"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pane 2: Chats or Search Results */}
            <div className="w-80 bg-[#112240] flex flex-col border-r border-slate-800/50">
                <div className="p-4 border-b border-slate-800/50 h-[69px] flex items-center justify-between">
                    <h3 className="font-medium text-slate-300">
                        {searchMode ? `Search Results` : (selectedProfileId ? 'Chats' : 'Select a Phone')}
                    </h3>
                    {searchMode && pagination.totalPages > 1 && (
                        <div className="flex items-center gap-1 text-xs">
                            <button
                                onClick={() => performSearch(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="p-1 rounded hover:bg-slate-700 disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <span className="text-slate-400">{pagination.page}/{pagination.totalPages}</span>
                            <button
                                onClick={() => performSearch(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="p-1 rounded hover:bg-slate-700 disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
                    {searchMode ? (
                        searchResults.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => setSelectedChatId(msg.chatId)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedChatId === msg.chatId
                                    ? 'bg-slate-800 border border-slate-700 text-white'
                                    : 'hover:bg-slate-800/50 text-slate-400'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-cyan-400">{msg.profileName}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate text-slate-300">{msg.chatName}</span>
                                    {msg.mediaUrl && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                                            {msg.mediaType || 'media'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <span className={msg.fromMe ? 'text-cyan-400' : 'text-orange-400'}>
                                        {msg.fromMe ? 'You' : 'Them'}:
                                    </span>
                                    <span className="truncate">{msg.body || '[Media]'}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedChatId === chat.id
                                    ? 'bg-slate-800 border border-slate-700 text-white'
                                    : 'hover:bg-slate-800/50 text-slate-400'
                                }`}
                            >
                                <div className="font-medium text-sm truncate">{chat.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-slate-500">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                                    <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-300">{chat._count.messages} msgs</span>
                                </div>
                            </div>
                        ))
                    )}

                    {!searchMode && chats.length === 0 && selectedProfileId && (
                        <div className="text-center text-slate-500 text-sm mt-10 px-4">
                            No history found for this phone. <br />Click &quot;Backup All Phones&quot; to start.
                        </div>
                    )}

                    {searchMode && searchResults.length === 0 && !isSearching && (
                        <div className="text-center text-slate-500 text-sm mt-10 px-4">
                            No matches found.
                        </div>
                    )}
                </div>
            </div>

            {/* Pane 3: Messages */}
            <div className="flex-1 flex flex-col bg-[#0A192F] relative">
                {selectedChatId ? (
                    <>
                        <div className="h-[69px] border-b border-slate-800/50 flex items-center px-6 bg-[#0A192F]/80 backdrop-blur-sm">
                            <h3 className="font-medium text-slate-200">
                                {chats.find(c => c.id === selectedChatId)?.name || searchResults.find(r => r.chatId === selectedChatId)?.chatName}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-lg text-sm ${msg.fromMe
                                        ? 'bg-cyan-700/50 text-white rounded-tr-none'
                                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                                    }`}>
                                        {msg.mediaUrl && (
                                            <div className="mb-2 rounded overflow-hidden">
                                                <img src={msg.mediaUrl} alt="Media" className="max-w-full h-auto" />
                                            </div>
                                        )}
                                        <p>{msg.body}</p>
                                        <div className="text-[10px] opacity-50 mt-1 text-right">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        Select a chat to view history
                    </div>
                )}
            </div>

            {/* Backup Progress Modal */}
            {showBackupModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-[#112240] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                {backupProgress.phase === 'complete' ? (
                                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                ) : backupProgress.phase === 'error' ? (
                                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                ) : (
                                    <svg className="w-5 h-5 text-cyan-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                )}
                                Backup Progress
                            </h3>
                            {!isBackingUp && (
                                <button onClick={closeBackupModal} className="text-slate-400 hover:text-white transition-colors">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="px-6 py-5">
                            {backupProgress.profileName && (
                                <div className="text-sm text-slate-300 mb-3">
                                    {isBackingUp ? 'Processing: ' : 'Completed: '}
                                    <span className="text-cyan-400 font-medium">{backupProgress.profileName}</span>
                                </div>
                            )}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>{backupProgress.message}</span>
                                    <span>{backupProgress.current}/{backupProgress.total}</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${backupProgress.phase === 'complete' ? 'bg-green-500' : backupProgress.phase === 'error' ? 'bg-red-500' : 'bg-cyan-500'}`}
                                        style={{ width: backupProgress.total > 0 ? `${(backupProgress.current / backupProgress.total) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            {backupProgress.stats && (
                                <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Chats Found</span><span className="text-slate-200">{backupProgress.stats.chatsFound}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Messages Found</span><span className="text-slate-200">{backupProgress.stats.messagesFound}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">New Messages Saved</span><span className="text-green-400 font-medium">{backupProgress.stats.newMessages}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-400">Duplicates Skipped</span><span className="text-slate-500">{backupProgress.stats.duplicatesSkipped}</span></div>
                                </div>
                            )}
                            {backupResults.length > 1 && backupProgress.phase === 'complete' && (
                                <div className="mt-4 space-y-2">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Results by Phone</div>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {backupResults.map(result => (
                                            <div key={result.profileId} className="flex items-center justify-between text-sm py-1">
                                                <span className="text-slate-300">{result.profileName}</span>
                                                {result.success ? (<span className="text-green-400">+{result.newMessages} msgs</span>) : (<span className="text-red-400 text-xs">{result.error}</span>)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isBackingUp && (
                            <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
                                <button onClick={closeBackupModal} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
