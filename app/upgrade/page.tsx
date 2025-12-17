'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function UpgradePage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [profilesCount, setProfilesCount] = useState(0);

    useEffect(() => {
        fetchProfilesCount();
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

    const currentTier = (session?.user as any)?.tier || 'STARTER';

    // Downgrade error modal state
    const [downgradeError, setDowngradeError] = useState<{ show: boolean; targetPlan: string; targetLimit: number } | null>(null);

    const plans = [
        { id: 'STARTER', name: 'Starter', price: 'R$ 9', limit: 2, color: 'from-slate-600 to-slate-700', features: ['2 WhatsApp accounts', 'Basic support', 'Message history'] },
        { id: 'PRO', name: 'Pro', price: 'R$ 50', limit: 5, color: 'from-cyan-600 to-blue-700', features: ['5 WhatsApp accounts', 'Priority support', 'Message history', 'Analytics dashboard'], popular: true },
        { id: 'BUSINESS', name: 'Business', price: 'R$ 100', limit: 10, color: 'from-purple-600 to-pink-700', features: ['10 WhatsApp accounts', '24/7 support', 'Message history', 'Analytics dashboard', 'White label branding'] },
    ];

    const currentPlan = plans.find(p => p.id === currentTier);
    const currentLimit = currentPlan?.limit || 2;

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
                router.push('/');
            }
        } catch (e) {
            console.error('Failed to update plan', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A192F] text-slate-300 font-sans">
            {/* Header */}
            <div className="border-b border-slate-800/50 bg-[#050c18]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white">
                            <span className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">Upgrade Your Plan</h1>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Current Status Card */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-1">You&apos;ve reached your profile limit</h2>
                            <p className="text-slate-400">
                                You&apos;re using <span className="text-amber-400 font-bold">{profilesCount}</span> of <span className="text-amber-400 font-bold">{currentLimit}</span> profiles on the <span className="text-white font-medium">{currentPlan?.name}</span> plan. Upgrade to add more WhatsApp accounts.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section Title */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h2>
                    <p className="text-slate-400 max-w-lg mx-auto">Select a plan that fits your needs. Upgrade anytime to unlock more features and WhatsApp accounts.</p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const isCurrentPlan = currentTier === plan.id;
                        const isDowngrade = plans.findIndex(p => p.id === plan.id) < plans.findIndex(p => p.id === currentTier);

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                                    isCurrentPlan
                                        ? 'border-green-500 bg-green-500/5'
                                        : plan.popular
                                        ? 'border-cyan-500 bg-[#112240] shadow-xl shadow-cyan-500/10'
                                        : 'border-slate-700 bg-[#112240] hover:border-slate-500'
                                }`}
                            >
                                {/* Popular Badge */}
                                {plan.popular && !isCurrentPlan && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold text-center py-1.5">
                                        MOST POPULAR
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isCurrentPlan && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold text-center py-1.5">
                                        CURRENT PLAN
                                    </div>
                                )}

                                <div className={`p-6 ${plan.popular || isCurrentPlan ? 'pt-10' : ''}`}>
                                    {/* Plan Header */}
                                    <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${plan.color} mb-4`}>
                                        {plan.name}
                                    </div>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                                        <span className="text-slate-400 text-sm">/month</span>
                                    </div>

                                    {/* Limit Highlight */}
                                    <div className="bg-slate-800/50 rounded-lg p-3 mb-6 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-white">{plan.limit}</div>
                                            <div className="text-xs text-slate-400">WhatsApp Accounts</div>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-3 mb-6">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => handleUpdatePlan(plan.id)}
                                        disabled={isCurrentPlan || loading}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                            isCurrentPlan
                                                ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                                                : isDowngrade
                                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                : plan.popular
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                                        }`}
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                Processing...
                                            </span>
                                        ) : isCurrentPlan ? (
                                            'Current Plan'
                                        ) : isDowngrade ? (
                                            'Downgrade'
                                        ) : (
                                            'Upgrade Now'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <div className="mt-10 text-center">
                    <p className="text-slate-500 text-sm">
                        Need more than 10 accounts? <a href="mailto:support@zaptodos.com" className="text-cyan-400 hover:text-cyan-300 underline">Contact us</a> for enterprise pricing.
                    </p>
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
        </div>
    );
}
