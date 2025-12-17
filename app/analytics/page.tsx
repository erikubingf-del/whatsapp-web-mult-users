'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
    totalMessages: number;
    totalChats: number;
    activePhones: number;
    messagesByProfile: { name: string; count: number }[];
    activityLast7Days: { date: string; count: number }[];
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics/summary');
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error('Failed to fetch analytics', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0A192F] items-center justify-center text-slate-400">
                Loading analytics...
            </div>
        );
    }

    if (!data) return null;

    // Ensure arrays exist with defaults
    const activityLast7Days = data.activityLast7Days || [];
    const messagesByProfile = data.messagesByProfile || [];

    // Calculate max for charts
    const maxActivity = activityLast7Days.length > 0 ? Math.max(...activityLast7Days.map(d => d.count), 1) : 1;
    const maxProfile = messagesByProfile.length > 0 ? Math.max(...messagesByProfile.map(d => d.count), 1) : 1;

    return (
        <div className="flex h-screen bg-[#0A192F] text-slate-300 font-sans overflow-hidden">
            {/* Navigation Rail */}
            <div className="w-16 bg-[#050c18] border-r border-slate-800/50 flex flex-col items-center py-6 gap-6 z-30">
                <div
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white cursor-pointer transition-transform hover:scale-105"
                    onClick={() => router.push('/')}
                >
                    <span className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
                </div>
                <div
                    className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
                    onClick={() => router.push('/history')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white cursor-pointer transition-transform hover:scale-105">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div
                    className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
                    onClick={() => router.push('/settings')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <h1 className="text-2xl font-bold text-white mb-8">Analytics Dashboard</h1>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg">
                        <div className="text-slate-400 text-sm font-medium mb-2">Total Messages</div>
                        <div className="text-3xl font-bold text-cyan-400">{(data.totalMessages || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg">
                        <div className="text-slate-400 text-sm font-medium mb-2">Total Chats</div>
                        <div className="text-3xl font-bold text-purple-400">{(data.totalChats || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg">
                        <div className="text-slate-400 text-sm font-medium mb-2">Active Phones</div>
                        <div className="text-3xl font-bold text-green-400">{data.activePhones || 0}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Chart */}
                    <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg">
                        <h3 className="text-lg font-medium text-white mb-6">Activity (Last 7 Days)</h3>
                        {activityLast7Days.length > 0 ? (
                            <div className="h-64 flex items-end justify-between gap-2">
                                {activityLast7Days.map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                        <div
                                            className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 rounded-t transition-all relative group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                                            style={{ height: `${(day.count / maxActivity) * 100}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                                                {day.count} msgs
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500 rotate-45 origin-left mt-2">{day.date.split('/')[0]}/{day.date.split('/')[1]}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                No activity data available
                            </div>
                        )}
                    </div>

                    {/* Top Profiles */}
                    <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg">
                        <h3 className="text-lg font-medium text-white mb-6">Messages by Phone</h3>
                        {messagesByProfile.length > 0 ? (
                            <div className="space-y-4">
                                {messagesByProfile.map((profile, i) => (
                                    <div key={i} className="group">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-300">{profile.name}</span>
                                            <span className="text-slate-500">{profile.count}</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(profile.count / maxProfile) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-slate-500">
                                No profile data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
