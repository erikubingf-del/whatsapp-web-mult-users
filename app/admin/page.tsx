'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    tier: string;
    isTrialActive: boolean;
    trialEndsAt: string | null;
    createdAt: string;
    profileCount: number;
    messageCount: number;
}

interface DashboardStats {
    totalUsers: number;
    activeTrials: number;
    paidUsers: number;
    totalProfiles: number;
    totalMessages: number;
    usersByTier: Record<string, number>;
    recentSignups: number;
}

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTier, setFilterTier] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/login');
            return;
        }

        // Check if user is admin
        fetchAdminData();
    }, [session, status, router]);

    const fetchAdminData = async () => {
        try {
            setLoading(true);

            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/stats'),
            ]);

            if (!usersRes.ok || !statsRes.ok) {
                if (usersRes.status === 403) {
                    // Redirect to dashboard if user lacks admin access
                    router.replace('/');
                    return;
                }
                throw new Error('Failed to fetch admin data');
            }

            const usersData = await usersRes.json();
            const statsData = await statsRes.json();

            setUsers(usersData.users || []);
            setStats(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    const updateUserTier = async (userId: string, tier: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, tier } : u));
            }
        } catch (err) {
            console.error('Failed to update user tier:', err);
        }
    };

    const updateUserRole = async (userId: string, role: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
            }
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const extendTrial = async (userId: string, days: number) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/extend-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days }),
            });

            if (res.ok) {
                fetchAdminData(); // Refresh data
            }
        } catch (err) {
            console.error('Failed to extend trial:', err);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchQuery ||
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTier = filterTier === 'all' || user.tier === filterTier;

        return matchesSearch && matchesTier;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A192F] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A192F] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A192F] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage users, subscriptions, and monitor system health</p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="Total Users"
                            value={stats.totalUsers}
                            icon={<UserIcon />}
                            color="cyan"
                        />
                        <StatCard
                            title="Active Trials"
                            value={stats.activeTrials}
                            icon={<ClockIcon />}
                            color="amber"
                        />
                        <StatCard
                            title="Paid Users"
                            value={stats.paidUsers}
                            icon={<CreditCardIcon />}
                            color="green"
                        />
                        <StatCard
                            title="Total Messages"
                            value={stats.totalMessages.toLocaleString()}
                            icon={<MessageIcon />}
                            color="purple"
                        />
                    </div>
                )}

                {/* Tier Distribution */}
                {stats && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Distribution</h2>
                        <div className="flex gap-4">
                            {Object.entries(stats.usersByTier).map(([tier, count]) => (
                                <div key={tier} className="flex-1 bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{tier.toLowerCase()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <select
                                    value={filterTier}
                                    onChange={(e) => setFilterTier(e.target.value)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="all">All Tiers</option>
                                    <option value="STARTER">Starter</option>
                                    <option value="PRO">Pro</option>
                                    <option value="BUSINESS">Business</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trial Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profiles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Messages</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.name || 'No Name'}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.role}
                                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                className={`px-2 py-1 text-sm border rounded ${
                                                    user.role === 'admin'
                                                        ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300'
                                                        : 'bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white'
                                                }`}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={user.tier}
                                                onChange={(e) => updateUserTier(user.id, e.target.value)}
                                                className="px-2 py-1 text-sm bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-gray-900 dark:text-white"
                                            >
                                                <option value="STARTER">Starter</option>
                                                <option value="PRO">Pro</option>
                                                <option value="BUSINESS">Business</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isTrialActive ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                    Trial (ends {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : 'N/A'})
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.profileCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {user.messageCount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="text-cyan-600 hover:text-cyan-500"
                                                >
                                                    View
                                                </button>
                                                {user.isTrialActive && (
                                                    <button
                                                        onClick={() => extendTrial(user.id, 7)}
                                                        className="text-amber-600 hover:text-amber-500"
                                                    >
                                                        +7 days
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No users found
                        </div>
                    )}
                </div>

                {/* User Detail Modal */}
                {selectedUser && (
                    <UserDetailModal
                        user={selectedUser}
                        onClose={() => setSelectedUser(null)}
                        onUpdate={fetchAdminData}
                    />
                )}
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
    const colorClasses: Record<string, string> = {
        cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
                </div>
            </div>
        </div>
    );
}

// User Detail Modal
function UserDetailModal({ user, onClose, onUpdate }: { user: User; onClose: () => void; onUpdate: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user.name || 'No Name'}</h3>
                        <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">User ID</div>
                            <div className="text-sm font-mono text-gray-900 dark:text-white truncate">{user.id}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Role</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{user.role}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Tier</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.tier}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Profiles</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.profileCount}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Messages</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.messageCount.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Joined</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(user.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>

                    {user.isTrialActive && user.trialEndsAt && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                            <div className="text-sm text-amber-800 dark:text-amber-400">
                                Trial ends on {new Date(user.trialEndsAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Icons
function UserIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CreditCardIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
    );
}

function MessageIcon() {
    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    );
}
