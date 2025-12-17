'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { translations } from '../translations';

export default function SettingsPage() {
    const router = useRouter();
    const sessionData = useSession();
    const session = sessionData?.data;
    const update = sessionData?.update;
    const [loading, setLoading] = useState(false);
    const [profilesCount, setProfilesCount] = useState(0);

    // Settings State
    const [companyName, setCompanyName] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [language, setLanguage] = useState<'en' | 'pt'>('pt');
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Logo crop modal state
    const [cropModal, setCropModal] = useState<{
        show: boolean;
        imageSrc: string;
        file: File | null;
    }>({ show: false, imageSrc: '', file: null });
    const [cropZoom, setCropZoom] = useState(1);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const cropImageRef = useRef<HTMLImageElement>(null);
    const cropContainerRef = useRef<HTMLDivElement>(null);

    // User menu state
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const t = translations[language];

    useEffect(() => {
        fetchProfilesCount();
        fetchSettings();

        // Close user menu when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProfilesCount = async () => {
        try {
            const res = await fetch('/api/profiles');
            const data = await res.json();
            const profilesList = Array.isArray(data) ? data : (data.profiles || []);
            setProfilesCount(profilesList.length);
        } catch (e) {
            console.error('Failed to fetch profiles', e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setCompanyName(data.companyName);
                setLogoUrl(data.logoUrl);
                setLanguage((data.language as 'en' | 'pt') || 'pt');
            }
        } catch (e) {
            console.error('Failed to fetch settings', e);
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Read file and open crop modal
        const reader = new FileReader();
        reader.onload = (event) => {
            setCropModal({
                show: true,
                imageSrc: event.target?.result as string,
                file: file
            });
            setCropZoom(1);
            setCropPosition({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCropMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - cropPosition.x, y: e.clientY - cropPosition.y });
    };

    const handleCropMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setCropPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleCropMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleCropMouseMove);
            window.addEventListener('mouseup', handleCropMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleCropMouseMove);
                window.removeEventListener('mouseup', handleCropMouseUp);
            };
        }
    }, [isDragging, handleCropMouseMove, handleCropMouseUp]);

    const handleCropSave = async () => {
        if (!cropModal.file || !cropImageRef.current || !cropContainerRef.current) return;

        setLogoUploading(true);
        setLogoError('');

        try {
            // Create canvas for cropping
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            const img = cropImageRef.current;
            const container = cropContainerRef.current;
            const containerRect = container.getBoundingClientRect();

            // Output size (square)
            const outputSize = 200;
            canvas.width = outputSize;
            canvas.height = outputSize;

            // Calculate the visible area of the image
            const imgDisplayWidth = img.naturalWidth * cropZoom;
            const imgDisplayHeight = img.naturalHeight * cropZoom;

            // Calculate what portion of the original image is visible in the crop area
            const scaleX = img.naturalWidth / imgDisplayWidth;
            const scaleY = img.naturalHeight / imgDisplayHeight;

            // The crop area center relative to the image
            const cropCenterX = (containerRect.width / 2 - cropPosition.x) * scaleX;
            const cropCenterY = (containerRect.height / 2 - cropPosition.y) * scaleY;

            // Source rectangle (from original image)
            const srcSize = Math.min(img.naturalWidth, img.naturalHeight) / cropZoom;
            const srcX = cropCenterX - srcSize / 2;
            const srcY = cropCenterY - srcSize / 2;

            // Draw the cropped image
            ctx.drawImage(
                img,
                Math.max(0, srcX),
                Math.max(0, srcY),
                srcSize,
                srcSize,
                0,
                0,
                outputSize,
                outputSize
            );

            // Convert to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png', 0.9);
            });

            // Upload
            const formData = new FormData();
            formData.append('logo', blob, 'logo.png');

            const res = await fetch('/api/settings/logo', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                setLogoError(data.error || 'Failed to upload logo');
            } else {
                setLogoUrl(data.logoUrl);
                setCropModal({ show: false, imageSrc: '', file: null });
            }
        } catch {
            setLogoError('Failed to upload logo');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleCropCancel = () => {
        setCropModal({ show: false, imageSrc: '', file: null });
        setCropZoom(1);
        setCropPosition({ x: 0, y: 0 });
    };

    const handleLogoDelete = async () => {
        setLogoUploading(true);
        setLogoError('');

        try {
            const res = await fetch('/api/settings/logo', {
                method: 'DELETE'
            });

            if (res.ok) {
                setLogoUrl(null);
            }
        } catch {
            setLogoError('Failed to delete logo');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName, language })
            });

            if (res.ok) {
                window.location.reload();
            }
        } catch (e) {
            console.error('Failed to save settings', e);
        } finally {
            setLoading(false);
        }
    };

    const currentTier = (session?.user as any)?.tier || 'STARTER';

    // Downgrade error modal state
    const [downgradeError, setDowngradeError] = useState<{ show: boolean; targetPlan: string; targetLimit: number } | null>(null);

    const plans = [
        { id: 'STARTER', name: 'Starter', price: 'R$ 9', limit: 2, color: 'bg-slate-700' },
        { id: 'PRO', name: 'Pro', price: 'R$ 50', limit: 5, color: 'bg-cyan-700' },
        { id: 'BUSINESS', name: 'Business', price: 'R$ 100', limit: 10, color: 'bg-purple-700' },
    ];

    const handleUpdatePlan = async (tier: string) => {
        // Check if downgrading and has too many profiles
        const targetPlan = plans.find(p => p.id === tier);
        if (targetPlan && profilesCount > targetPlan.limit) {
            setDowngradeError({
                show: true,
                targetPlan: targetPlan.name,
                targetLimit: targetPlan.limit
            });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/subscription/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier })
            });

            if (res.ok) {
                await update({ tier });
                router.refresh();
            }
        } catch (e) {
            console.error('Failed to update plan', e);
        } finally {
            setLoading(false);
        }
    };

    const currentLimit = plans.find(p => p.id === currentTier)?.limit || 2;

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
                <div
                    className="w-10 h-10 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 flex items-center justify-center cursor-pointer transition-all"
                    onClick={() => router.push('/analytics')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white cursor-pointer transition-transform hover:scale-105">
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

                    {userMenuOpen && (
                        <div className="absolute bottom-14 left-0 w-64 bg-[#112240] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                            <div className="p-2">
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

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <h1 className="text-2xl font-bold text-white mb-2">{t.settingsTitle}</h1>
                <p className="text-slate-400 mb-8">{t.settingsDesc}</p>

                {/* White Label Settings */}
                <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg mb-8">
                    <h2 className="text-lg font-medium text-white mb-4">White Label / Branding</h2>

                    {/* Logo Upload Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-400 mb-3">Company Logo</label>
                        <div className="flex items-start gap-6">
                            {/* Logo Preview */}
                            <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center">
                                            <svg className="w-8 h-8 text-slate-500 mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            <span className="text-xs text-slate-500">No logo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload Controls */}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={logoUploading}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {logoUploading ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                Upload Logo
                                            </>
                                        )}
                                    </button>
                                    {logoUrl && (
                                        <button
                                            onClick={handleLogoDelete}
                                            disabled={logoUploading}
                                            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Reset to Default
                                        </button>
                                    )}
                                </div>
                                {logoError && (
                                    <p className="text-rose-400 text-sm mb-2">{logoError}</p>
                                )}
                                <div className="text-xs text-slate-500 space-y-1">
                                    <p>Recommended: Square image (1:1 ratio) for best results</p>
                                    <p>Formats: PNG, JPG, SVG, WebP (max 2MB)</p>
                                    <p>This logo will replace the default icon in the navigation rail and sidebar.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-700/50 my-6" />

                    {/* Language & Company Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">{t.companyName}</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                placeholder="My Users"
                            />
                            <p className="text-xs text-slate-500 mt-1">{t.companyNameDesc}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">{t.language}</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as 'en' | 'pt')}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors"
                            >
                                <option value="en">English</option>
                                <option value="pt">Portuguese (Português)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveSettings}
                            disabled={loading || settingsLoading}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? t.saving : t.saveChanges}
                        </button>
                    </div>
                </div>

                {/* Usage Card */}
                <div className="bg-[#112240] p-6 rounded-xl border border-slate-800/50 shadow-lg mb-8">
                    <h2 className="text-lg font-medium text-white mb-4">{t.currentUsage}</h2>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">{t.activeProfiles}</span>
                        <span className="text-white font-bold">{profilesCount} / {currentLimit}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${profilesCount >= currentLimit ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((profilesCount / currentLimit) * 100, 100)}%` }}
                        ></div>
                    </div>
                    {profilesCount >= currentLimit && (
                        <p className="text-red-400 text-sm mt-2">{t.limitReached}</p>
                    )}
                </div>

                {/* Plans */}
                <h2 className="text-xl font-bold text-white mb-6">{t.availablePlans}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, index) => {
                        const currentTierIndex = plans.findIndex(p => p.id === currentTier);
                        const isDowngrade = index < currentTierIndex;
                        const isCurrentPlan = currentTier === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`relative p-6 rounded-xl border-2 transition-all ${isCurrentPlan
                                    ? 'border-green-500 bg-[#1a2c4e]'
                                    : 'border-slate-800 bg-[#112240] hover:border-slate-600'
                                    }`}
                            >
                                {isCurrentPlan && (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                                        {t.currentPlan}
                                    </div>
                                )}
                                <div className={`text-xs font-bold px-2 py-1 rounded w-fit mb-4 text-white ${plan.color}`}>
                                    {plan.name}
                                </div>
                                <div className="text-3xl font-bold text-white mb-2">{plan.price}<span className="text-sm text-slate-400 font-normal">{t.month}</span></div>
                                <div className="text-slate-400 mb-6">{plan.limit} {t.whatsappAccounts}</div>

                                <button
                                    onClick={() => handleUpdatePlan(plan.id)}
                                    disabled={isCurrentPlan || loading}
                                    className={`w-full py-2 rounded font-bold transition-colors ${isCurrentPlan
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : isDowngrade
                                        ? 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                        }`}
                                >
                                    {isCurrentPlan ? t.active : isDowngrade ? 'Downgrade' : t.upgrade}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Downgrade Error Modal */}
            {downgradeError?.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#112240] border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-red-500/10 to-orange-500/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Cannot Downgrade</h3>
                                    <p className="text-sm text-slate-400">Too many active profiles</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300 mb-4">
                                You currently have <span className="text-white font-bold">{profilesCount} profiles</span>, but the <span className="text-white font-bold">{downgradeError.targetPlan}</span> plan only allows <span className="text-white font-bold">{downgradeError.targetLimit} profiles</span>.
                            </p>
                            <p className="text-slate-400 text-sm mb-6">
                                To avoid accidentally deleting your data, please go to the dashboard and manually remove {profilesCount - downgradeError.targetLimit} profile{profilesCount - downgradeError.targetLimit > 1 ? 's' : ''} before downgrading.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push('/')}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={() => setDowngradeError(null)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logo Crop Modal */}
            {cropModal.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#112240] border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Crop Your Logo</h3>
                                    <p className="text-sm text-slate-400">Drag to position, use slider to zoom</p>
                                </div>
                                <button
                                    onClick={handleCropCancel}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Crop Area */}
                            <div className="flex justify-center mb-6">
                                <div
                                    ref={cropContainerRef}
                                    className="relative w-64 h-64 rounded-xl overflow-hidden bg-slate-900 border-2 border-dashed border-cyan-500/50 cursor-move"
                                    onMouseDown={handleCropMouseDown}
                                >
                                    {/* Grid overlay */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className="border border-white/10" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Image */}
                                    <img
                                        ref={cropImageRef}
                                        src={cropModal.imageSrc}
                                        alt="Crop preview"
                                        className="absolute select-none"
                                        style={{
                                            transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                                            transformOrigin: 'center center',
                                            maxWidth: 'none',
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            left: '50%',
                                            top: '50%',
                                            marginLeft: '-50%',
                                            marginTop: '-50%'
                                        }}
                                        draggable={false}
                                    />

                                    {/* Corner indicators */}
                                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Zoom Slider */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                                    <span>Zoom</span>
                                    <span>{Math.round(cropZoom * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={cropZoom}
                                        onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                </div>
                            </div>

                            {/* Reset Position */}
                            <div className="flex justify-center mb-6">
                                <button
                                    onClick={() => {
                                        setCropPosition({ x: 0, y: 0 });
                                        setCropZoom(1);
                                    }}
                                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                    Reset Position
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCropSave}
                                    disabled={logoUploading}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {logoUploading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            Save Logo
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCropCancel}
                                    disabled={logoUploading}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:cursor-not-allowed text-slate-300 font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
