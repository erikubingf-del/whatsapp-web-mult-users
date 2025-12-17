'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { translations } from '../translations';

export default function SelectPlanPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [language, setLanguage] = useState<'pt' | 'en'>('pt');

    const t = translations[language];

    useEffect(() => {
        // If not authenticated, redirect to login
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setLanguage((data.language as 'en' | 'pt') || 'pt');
            }
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

    const plans = [
        {
            id: 'STARTER',
            name: 'Starter',
            price: 'R$ 9',
            limit: 2,
            color: 'from-slate-600 to-slate-700',
            features: [`2 ${t.whatsappAccounts}`, t.basicSupport, t.messageHistory]
        },
        {
            id: 'PRO',
            name: 'Pro',
            price: 'R$ 50',
            limit: 5,
            color: 'from-cyan-600 to-blue-700',
            features: [`5 ${t.whatsappAccounts}`, t.prioritySupport, t.messageHistory, t.analyticsDashboard],
            popular: true
        },
        {
            id: 'BUSINESS',
            name: 'Business',
            price: 'R$ 100',
            limit: 10,
            color: 'from-purple-600 to-pink-700',
            features: [`10 ${t.whatsappAccounts}`, t.support247, t.messageHistory, t.analyticsDashboard, t.whiteLabelBrandingFeature]
        },
    ];

    const handleSelectPlan = async (tier: string) => {
        setSelectedPlan(tier);
        setLoading(true);

        try {
            const res = await fetch('/api/subscription/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier })
            });

            if (res.ok) {
                await update({ tier });
                router.push('/');
            } else {
                console.error('Failed to select plan');
                setLoading(false);
                setSelectedPlan(null);
            }
        } catch (e) {
            console.error('Failed to select plan', e);
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A192F] text-slate-300 font-sans">
            {/* Header */}
            <div className="border-b border-slate-800/50 bg-[#050c18]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 text-white">
                            <span className="text-xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{t.selectPlanWelcome}</h1>
                            <p className="text-sm text-slate-400">{session?.user?.email}</p>
                        </div>
                    </div>
                    {/* Language Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLanguage('pt')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                language === 'pt'
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            PT
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                language === 'en'
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Welcome Section */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-3">{t.selectPlanTitle}</h2>
                    <p className="text-slate-400 max-w-lg mx-auto">{t.selectPlanDesc}</p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                                selectedPlan === plan.id
                                    ? 'border-green-500 bg-green-500/5 scale-[1.02]'
                                    : plan.popular
                                    ? 'border-cyan-500 bg-[#112240] shadow-xl shadow-cyan-500/10'
                                    : 'border-slate-700 bg-[#112240] hover:border-slate-500'
                            }`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold text-center py-1.5">
                                    {t.mostPopular.toUpperCase()}
                                </div>
                            )}

                            {/* Free Trial Badge */}
                            <div className="absolute top-2 right-2">
                                <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-full border border-green-500/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                                    {t.freeTrialBadge}
                                </span>
                            </div>

                            <div className={`p-6 ${plan.popular ? 'pt-10' : 'pt-8'}`}>
                                {/* Plan Header */}
                                <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${plan.color} mb-4`}>
                                    {plan.name}
                                </div>

                                {/* Price */}
                                <div className="mb-2">
                                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                                    <span className="text-slate-400 text-sm">{t.month}</span>
                                </div>

                                {/* Trial Info */}
                                <p className="text-xs text-green-400 mb-6">{t.trialInfo}</p>

                                {/* Limit Highlight */}
                                <div className="bg-slate-800/50 rounded-lg p-3 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{plan.limit}</div>
                                        <div className="text-xs text-slate-400">{t.whatsappAccounts}</div>
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
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={loading}
                                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                                        selectedPlan === plan.id
                                            ? 'bg-green-500/20 text-green-400'
                                            : plan.popular
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                                    }`}
                                >
                                    {loading && selectedPlan === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                            {t.processingPayment}
                                        </span>
                                    ) : (
                                        t.startFreeTrial
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="text-center">
                    <p className="text-slate-500 text-sm mb-2">
                        {t.trialEndsInfo}
                    </p>
                    <p className="text-slate-500 text-sm">
                        {t.needMoreAccounts} <a href="mailto:support@zaptodos.com" className="text-cyan-400 hover:text-cyan-300 underline">{t.contactUs}</a> {t.forEnterprise}
                    </p>
                </div>
            </div>
        </div>
    );
}
