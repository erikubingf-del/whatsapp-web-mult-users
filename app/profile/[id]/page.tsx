'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'loading';

interface ProfileData {
    id: string;
    name: string;
    phoneNumber?: string;
    lastScraped?: string;
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [timestamp, setTimestamp] = useState(Date.now());
    const [status, setStatus] = useState<ConnectionStatus>('loading');
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupMessage, setBackupMessage] = useState('');
    const [showControls, setShowControls] = useState(true);

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch(`/api/profiles/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (e) {
            console.error('Failed to fetch profile', e);
        }
    }, [id]);

    // Fetch connection status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/profiles/${id}/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status || 'disconnected');
            }
        } catch (e) {
            setStatus('disconnected');
        }
    }, [id]);

    // Initial load and polling
    useEffect(() => {
        fetchProfile();
        fetchStatus();

        const statusInterval = setInterval(fetchStatus, 3000);
        const screenshotInterval = setInterval(() => {
            setTimestamp(Date.now());
        }, 1000);

        return () => {
            clearInterval(statusInterval);
            clearInterval(screenshotInterval);
        };
    }, [fetchProfile, fetchStatus]);

    // Handle backup
    const handleBackup = async () => {
        setIsBackingUp(true);
        setBackupMessage('Starting backup...');

        try {
            const res = await fetch(`/api/profiles/${id}/scrape`, { method: 'POST' });
            const data = await res.json();

            if (data.success !== false) {
                setBackupMessage(`Backup complete! ${data.stats?.newMessages || 0} new messages saved.`);
            } else {
                setBackupMessage(`Backup failed: ${data.error}`);
            }
        } catch (e) {
            setBackupMessage('Backup failed: Network error');
        } finally {
            setIsBackingUp(false);
            setTimeout(() => setBackupMessage(''), 5000);
        }
    };

    // Status badge component
    const StatusBadge = () => {
        const statusConfig = {
            connected: {
                color: 'bg-green-500',
                text: 'Connected',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                ),
            },
            disconnected: {
                color: 'bg-yellow-500',
                text: 'Scan QR Code',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                ),
            },
            connecting: {
                color: 'bg-blue-500',
                text: 'Connecting...',
                icon: (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                ),
            },
            loading: {
                color: 'bg-slate-500',
                text: 'Loading...',
                icon: (
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    </svg>
                ),
            },
        };

        const config = statusConfig[status];

        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color} text-white text-sm font-medium`}>
                {config.icon}
                {config.text}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-[#0A192F]">
            {/* Header */}
            <div className="bg-[#112240] border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">{profile?.name || 'Loading...'}</h1>
                        {profile?.phoneNumber && (
                            <p className="text-xs text-slate-400">{profile.phoneNumber}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <StatusBadge />

                    <button
                        onClick={() => setShowControls(!showControls)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title={showControls ? 'Hide controls' : 'Show controls'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Screenshot area */}
                <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative">
                    {/* QR Code instruction overlay */}
                    {status === 'disconnected' && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">Scan the QR code with your phone</span>
                        </div>
                    )}

                    {/* Screenshot */}
                    <img
                        src={`/api/profiles/${id}/screenshot?t=${timestamp}`}
                        alt="WhatsApp Session"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                    />
                </div>

                {/* Side panel */}
                {showControls && (
                    <div className="w-72 bg-[#112240] border-l border-slate-700 p-4 flex flex-col gap-4">
                        {/* Connection Status Card */}
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-slate-400 mb-3">Connection Status</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300">Status</span>
                                    <span className={`text-sm font-medium ${
                                        status === 'connected' ? 'text-green-400' :
                                        status === 'disconnected' ? 'text-yellow-400' :
                                        'text-blue-400'
                                    }`}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                </div>
                                {profile?.lastScraped && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">Last Backup</span>
                                        <span className="text-sm text-slate-400">
                                            {new Date(profile.lastScraped).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <button
                                onClick={handleBackup}
                                disabled={isBackingUp || status !== 'connected'}
                                className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                    status === 'connected' && !isBackingUp
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {isBackingUp ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Backing up...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Backup Messages
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => router.push('/history')}
                                className="w-full py-2.5 px-4 rounded-lg font-medium text-sm bg-slate-700 hover:bg-slate-600 text-white transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View History
                            </button>
                        </div>

                        {/* Backup message */}
                        {backupMessage && (
                            <div className={`text-sm p-3 rounded-lg ${
                                backupMessage.includes('complete')
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                                {backupMessage}
                            </div>
                        )}

                        {/* Instructions */}
                        {status === 'disconnected' && (
                            <div className="bg-slate-800/50 rounded-lg p-4 mt-auto">
                                <h3 className="text-sm font-medium text-slate-300 mb-2">How to Connect</h3>
                                <ol className="text-xs text-slate-400 space-y-2">
                                    <li className="flex gap-2">
                                        <span className="text-cyan-400">1.</span>
                                        Open WhatsApp on your phone
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-cyan-400">2.</span>
                                        Go to Settings → Linked Devices
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-cyan-400">3.</span>
                                        Tap "Link a Device"
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-cyan-400">4.</span>
                                        Scan the QR code shown on the left
                                    </li>
                                </ol>
                            </div>
                        )}

                        {status === 'connected' && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-auto">
                                <div className="flex items-center gap-2 text-green-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">WhatsApp Connected</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Your messages are being backed up automatically.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
