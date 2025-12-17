'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Plan, 2: Form
    const [selectedPlan, setSelectedPlan] = useState('STARTER');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const plans = [
        {
            id: 'STARTER',
            name: 'Starter',
            price: 'R$ 9',
            limit: '2 Accounts',
            features: ['Basic Support', 'Standard Speed'],
            color: 'from-slate-700 to-slate-800',
            border: 'border-slate-600'
        },
        {
            id: 'PRO',
            name: 'Pro',
            price: 'R$ 50',
            limit: '5 Accounts',
            features: ['Priority Support', 'Fast Speed', 'Analytics'],
            color: 'from-cyan-900/80 to-blue-900/80',
            border: 'border-cyan-500',
            popular: true
        },
        {
            id: 'BUSINESS',
            name: 'Business',
            price: 'R$ 100',
            limit: '10 Accounts',
            features: ['24/7 Support', 'Max Speed', 'Advanced Analytics', 'API Access'],
            color: 'from-purple-900/80 to-indigo-900/80',
            border: 'border-purple-500'
        },
    ];

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password, tier: selectedPlan })
            });

            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else {
                router.push('/login');
            }
        } catch (e) {
            setError('Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050c18] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl z-10 p-4">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                        Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Whatsview</span>
                    </h1>
                    <p className="text-slate-400">Manage multiple WhatsApp accounts with ease.</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-slate-800">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
                            style={{ width: step === 1 ? '50%' : '100%' }}
                        />
                    </div>

                    <div className="p-8 md:p-12">
                        {step === 1 ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-2xl font-bold text-white text-center mb-8">Choose your Plan</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    {plans.map(plan => (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlan(plan.id)}
                                            className={`relative p-6 rounded-xl border cursor-pointer transition-all duration-300 group ${selectedPlan === plan.id
                                                ? `${plan.border} bg-gradient-to-br ${plan.color} shadow-lg shadow-cyan-500/10 transform scale-105 z-10`
                                                : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800'
                                                }`}
                                        >
                                            {plan.popular && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                                    Most Popular
                                                </div>
                                            )}
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                                                <div className="text-3xl font-bold text-white mb-1">{plan.price}<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                                                <div className="text-sm text-cyan-400 font-medium mb-4">{plan.limit}</div>

                                                <div className="space-y-2 text-left border-t border-white/10 pt-4">
                                                    {plan.features.map((feature, i) => (
                                                        <div key={i} className="flex items-center text-xs text-slate-300">
                                                            <svg className="w-3 h-3 mr-2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            {feature}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full md:w-auto px-12 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center group"
                                    >
                                        Continue
                                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-white mb-2">Create your Account</h2>
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
                                        Selected: <span className="text-cyan-400 font-bold ml-1">{selectedPlan}</span>
                                        <button onClick={() => setStep(1)} className="ml-2 hover:text-white transition-colors">Change</button>
                                    </div>
                                </div>

                                <form onSubmit={handleRegister} className="space-y-5">
                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            {error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">First Name</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                                placeholder="John"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Last Name</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                                placeholder="Doe"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Confirm</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`w-full bg-slate-950/50 border rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:ring-1 outline-none transition-all ${confirmPassword && password !== confirmPassword
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                                    : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500'
                                                    }`}
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Creating Account...
                                            </span>
                                        ) : 'Create Account'}
                                    </button>
                                </form>

                                <div className="mt-8">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-800"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-4 bg-[#0d1626] text-slate-500">Or continue with</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => signIn('google', { callbackUrl: '/' })}
                                        className="mt-6 w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign up with Google
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900/50 p-6 text-center border-t border-slate-800">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <a href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-all">
                                Sign in
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
