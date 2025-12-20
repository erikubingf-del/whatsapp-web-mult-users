'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { translations } from './translations';

interface Profile {
  id: string;
  name: string;
  phoneNumber?: string;
  isActive: boolean;
  status?: 'connected' | 'disconnected' | 'connecting';
}

export default function Home() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Settings State
  const [companyName, setCompanyName] = useState('My Users');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'pt'>('pt');
  const t = translations[language];

  // Edit & Menu States
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth check - redirect to login if not authenticated, or to plan selection if no plan selected
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    // Refresh session to ensure tier is up-to-date
    updateSession();
    // Check if user has selected a plan (has started trial)
    const hasSelectedPlan = (session.user as any)?.hasSelectedPlan;
    if (!hasSelectedPlan) {
      router.push('/select-plan');
    }
  }, [session, status, router, updateSession]);

  useEffect(() => {
    if (!session) return;
    fetchProfiles();
    fetchSettings();

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
        setDeleteConfirmId(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName || 'My Users');
        setLogoUrl(data.logoUrl || null);
        setLanguage((data.language as 'en' | 'pt') || 'pt');
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProfiles(data);
        if (!selectedProfileId && data.length > 0) {
          setSelectedProfileId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching profiles:', e);
    }
  };

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createProfile = async () => {
    if (!newName.trim() || createLoading) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setNewName('');
        setIsCreating(false);
        fetchProfiles();
      } else {
        // Profile might still be created even on error - refresh anyway
        setCreateError(data.error || 'Failed to create profile');
        fetchProfiles();
        // Auto-close form after showing error briefly
        setTimeout(() => {
          setNewName('');
          setIsCreating(false);
          setCreateError(null);
        }, 2000);
      }
    } catch (e) {
      console.error('Error creating profile:', e);
      setCreateError('Network error');
      fetchProfiles(); // Still try to refresh
    } finally {
      setCreateLoading(false);
    }
  };

  const startEditing = (profile: Profile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      const res = await fetch(`/api/profiles/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setEditingId(null);
        fetchProfiles();
      }
    } catch (e) {
      console.error('Error updating profile:', e);
    }
  };

  // Show loading while checking auth
  if (status === 'loading' || !session) {
    return (
      <div className="flex h-screen bg-[#0A192F] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const deleteProfile = async (id: string) => {
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    if (selectedProfileId === id) setSelectedProfileId(null);
    setDeleteConfirmId(null);
    setMenuOpenId(null);
    fetchProfiles();
  };

  return (
    <div className="flex h-screen bg-[#0A192F] text-slate-300 font-sans overflow-hidden selection:bg-cyan-500/30">
      {/* Navigation Rail */}
      <div className="w-16 bg-[#050c18] border-r border-slate-800/50 flex flex-col items-center py-6 gap-6 z-30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white cursor-pointer transition-transform hover:scale-105">
          <span className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
        </div>
        <div
          className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
          onClick={() => router.push('/history')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <div
          className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
          onClick={() => router.push('/analytics')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        </div>
        <div
          className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
          onClick={() => router.push('/settings')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </div>

        {/* User Avatar - pushed to bottom */}
        <div className="mt-auto relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-transform hover:scale-105 shadow-lg shadow-purple-500/20"
          >
            {session.user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </button>

          {/* User Menu Popup */}
          {userMenuOpen && (
            <div className="absolute bottom-14 left-0 w-64 bg-[#112240] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* User Info Header */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                    {session.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{session.user?.name || 'User'}</div>
                    <div className="text-xs text-slate-400 truncate">{session.user?.email}</div>
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
                {(session.user as any)?.hasPassword && (
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

      {/* Sidebar */}
      <div className="w-80 bg-[#112240] flex flex-col border-r border-slate-800/50 shadow-xl z-20">
        {/* Header */}
        <div className="p-6 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 max-w-[180px] object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h1 className="font-bold text-xl text-slate-100 tracking-tight">{companyName}</h1>
            </>
          )}
        </div>

        {/* Profile List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">{t.activeSessions}</div>

          {profiles.map(profile => (
            <div
              key={profile.id}
              className={`group relative p-3 rounded-xl border transition-all duration-200 ${selectedProfileId === profile.id
                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/20'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
            >
              {editingId === profile.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    className="w-full bg-slate-900/80 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={saveEdit}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedProfileId(profile.id)}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium text-sm">
                      {profile.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full ${profile.status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                        profile.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                          'bg-red-500'
                        }`} />
                      <h3 className="font-semibold text-slate-200">{profile.name}</h3>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mb-4">
                      {profile.status === 'connected' ? t.online : profile.status === 'connecting' ? t.connecting : t.disconnected}
                    </div>
                  </div>

                  {/* Menu Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === profile.id ? null : profile.id);
                      setDeleteConfirmId(null);
                    }}
                    className={`p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-opacity ${menuOpenId === profile.id ? 'opacity-100 bg-slate-700/50' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                  </button>
                </div>
              )}

              {/* Context Menu */}
              {menuOpenId === profile.id && !editingId && (
                <div ref={menuRef} className="absolute right-2 top-10 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {deleteConfirmId === profile.id ? (
                    <div className="p-1">
                      <button
                        onClick={() => deleteProfile(profile.id)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded flex items-center justify-between"
                      >
                        {t.confirm}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => startEditing(profile)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                        {t.editName}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(profile.id)}
                        className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        {t.delete}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Create New Profile or Upgrade Button */}
          {(() => {
            const tierLimits: Record<string, number> = { STARTER: 2, PRO: 5, BUSINESS: 10 };
            const currentTier = (session?.user as any)?.tier || 'STARTER';
            const maxProfiles = tierLimits[currentTier] || 2;
            const isAtLimit = profiles.length >= maxProfiles;

            if (isAtLimit) {
              return (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="w-full p-3 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 flex items-center justify-center gap-2 transition-all duration-200 group"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                  <span className="text-sm font-medium">Upgrade Plan</span>
                  <span className="text-xs text-amber-500/70">({profiles.length}/{maxProfiles})</span>
                </button>
              );
            }

            if (!isCreating) {
              return (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-950/20 flex items-center justify-center gap-2 transition-all duration-200 group"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 group-hover:bg-cyan-500/20 flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </div>
                  <span className="text-sm font-medium">{t.addProfile}</span>
                </button>
              );
            }

            return (
              <div className="p-3 rounded-xl border border-cyan-500/50 bg-slate-800/50 animate-in fade-in slide-in-from-top-2">
                <input
                  autoFocus
                  type="text"
                  placeholder={t.profileName}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !createLoading) createProfile();
                    if (e.key === 'Escape' && !createLoading) setIsCreating(false);
                  }}
                  disabled={createLoading}
                />
                {createError && (
                  <div className="text-xs text-red-400 mb-2 px-1">{createError}</div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={createProfile}
                    disabled={createLoading || !newName.trim()}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white text-xs font-medium py-1.5 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    {createLoading ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        {t.connecting}
                      </>
                    ) : t.create}
                  </button>
                  <button
                    onClick={() => { setIsCreating(false); setCreateError(null); }}
                    disabled={createLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs font-medium py-1.5 rounded-md transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#0A192F] relative">
        {/* Header */}
        <div className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 bg-[#0A192F]/80 backdrop-blur-sm z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-wide">
              <span className="text-white font-light">ZAP</span>
              <span className="text-white font-semibold">TODOS</span>
            </h1>
          </div>
          {/* Live Status Indicator */}
          {selectedProfileId && connectionStatus && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'error' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
              {connectionStatus === 'connected' ? 'Live' :
               connectionStatus === 'error' ? 'Connection Error' :
               'Connecting...'}
            </div>
          )}
        </div>

        {/* View Area - WhatsApp cream color background */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-start items-center" style={{ backgroundColor: '#fcf5eb' }}>

          {selectedProfileId ? (
            <SessionStream profileId={selectedProfileId} onStatusChange={setConnectionStatus} />
          ) : (
            <div className="text-center mt-20">
              <div className="w-20 h-20 bg-white/80 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              </div>
              <h3 className="text-xl font-medium text-slate-700 mb-2">No Session Selected</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Select a profile from the sidebar to view its active WhatsApp session, or create a new profile to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { io, Socket } from 'socket.io-client';

function SessionStream({ profileId, onStatusChange }: { profileId: string; onStatusChange: (status: 'connecting' | 'connected' | 'error') => void }) {
  const [src, setSrc] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Report status changes to parent
  useEffect(() => {
    onStatusChange(connectionStatus);
  }, [connectionStatus, onStatusChange]);

  useEffect(() => {
    // Connect to socket with credentials (cookies will be sent automatically)
    const socket = io({
      withCredentials: true,
      // Auth token will be read from cookies on the server side
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket');
      setConnectionStatus('connected');
      socket.emit('join-session', profileId);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionStatus('error');
      setErrorMessage(error?.message || 'An error occurred');
    });

    socket.on('frame', (base64: string) => {
      setSrc(`data:image/jpeg;base64,${base64}`);
      // First frame received means we're truly connected
      if (connectionStatus === 'connecting') {
        setConnectionStatus('connected');
      }
    });

    return () => {
      socket.emit('leave-session', profileId);
      socket.disconnect();
    };
  }, [profileId]);

  const handleInput = (type: string, e: any) => {
    if (!imgRef.current || !socketRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    const eventData: any = { type };

    // Filter mouse buttons
    if (type === 'mousedown' || type === 'mouseup') {
      if (e.button !== 0) return; // Only allow Left Click for down/up
    }

    if (type === 'mousemove' || type === 'mousedown' || type === 'mouseup' || type === 'contextmenu' || type === 'dblclick') {
      eventData.x = (e.clientX - rect.left) * scaleX;
      eventData.y = (e.clientY - rect.top) * scaleY;
    }

    if (type === 'wheel') {
      eventData.deltaX = e.deltaX;
      eventData.deltaY = e.deltaY;
    }

    if (type === 'keydown' || type === 'keyup') {
      eventData.key = e.key;
    }

    socketRef.current.emit('input', { profileId, event: eventData });
  };

  // Keyboard listener needs to be on window or focused element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleInput('keydown', e);
    const handleKeyUp = (e: KeyboardEvent) => handleInput('keyup', e);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [profileId]);

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {src ? (
          <img
            ref={imgRef}
            src={src}
            alt="Session Stream"
            className="w-full h-full object-contain object-center"
            onMouseMove={(e) => handleInput('mousemove', e)}
            onMouseDown={(e) => handleInput('mousedown', e)}
            onMouseUp={(e) => handleInput('mouseup', e)}
            onDoubleClick={(e) => handleInput('dblclick', e)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleInput('contextmenu', e);
            }}
            onWheel={(e) => handleInput('wheel', e)}
            onDragStart={(e) => e.preventDefault()}
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            {connectionStatus === 'error' ? (
              <>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-medium mb-1">Connection Failed</div>
                  <div className="text-slate-500 text-sm max-w-xs">{errorMessage || 'Unable to connect to session. Please try refreshing the page.'}</div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                >
                  Refresh Page
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-slate-300 border-t-green-500 rounded-full animate-spin" />
                <div className="text-slate-600">Connecting to session...</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
