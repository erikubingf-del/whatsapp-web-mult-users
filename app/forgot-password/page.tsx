'use client';

import { useState } from 'react';
import Link from 'next/link';
import { translations } from '../translations';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resetUrl, setResetUrl] = useState('');
    const [language, setLanguage] = useState<'pt' | 'en'>('pt');

    const t = translations[language];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        setResetUrl('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage(data.message);
                if (data.resetUrl) {
                    setResetUrl(data.resetUrl);
                }
            } else {
                setError(data.error || t.errorOccurred);
            }
        } catch (err) {
            setError(t.errorOccurred);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050c18] relative overflow-hidden">
            {/* Language Switcher */}
            <div className="absolute top-6 right-6 z-20">
                <div className="flex items-center gap-1 bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50">
                    <button
                        onClick={() => setLanguage('pt')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                            language === 'pt'
                                ? 'bg-cyan-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        PT
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                            language === 'en'
                                ? 'bg-cyan-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        EN
                    </button>
                </div>
            </div>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md z-10 p-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.forgotPasswordTitle}</h1>
                    <p className="text-slate-400">{t.forgotPasswordDesc}</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                {message}
                            </div>
                        )}

                        {/* Dev mode: Show reset link */}
                        {resetUrl && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-lg mb-6 text-xs">
                                <div className="font-medium mb-1">{t.devModeResetLink}</div>
                                <a href={resetUrl} className="break-all hover:underline">{resetUrl}</a>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                    {t.emailAddress}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? t.sending : t.sendResetLink}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-900/50 p-6 text-center border-t border-slate-800">
                        <p className="text-sm text-slate-500">
                            {t.rememberPassword}{' '}
                            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-all">
                                {t.signIn}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
