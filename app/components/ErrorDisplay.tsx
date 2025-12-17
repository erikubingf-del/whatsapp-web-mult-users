'use client';

import { useState, useEffect, useCallback } from 'react';

// Error types for specific handling
export type ErrorType =
    | 'error'
    | 'warning'
    | 'info'
    | 'rate-limit'
    | 'network'
    | 'auth'
    | 'validation'
    | 'session';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    retry?: () => void;
    dismiss?: () => void;
    type?: ErrorType;
    errorCode?: string;
    details?: string;
    retryAfter?: number; // seconds until retry for rate limits
}

const typeConfig: Record<ErrorType, {
    bg: string;
    border: string;
    icon: string;
    title: string;
    iconPath: string;
    defaultTitle: string;
}> = {
    error: {
        bg: 'bg-red-500/10 dark:bg-red-500/10',
        border: 'border-red-500/20',
        icon: 'text-red-500 dark:text-red-400',
        title: 'text-red-600 dark:text-red-400',
        iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        defaultTitle: 'Error',
    },
    warning: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: 'text-amber-500 dark:text-amber-400',
        title: 'text-amber-600 dark:text-amber-400',
        iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        defaultTitle: 'Warning',
    },
    info: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/10',
        border: 'border-blue-500/20',
        icon: 'text-blue-500 dark:text-blue-400',
        title: 'text-blue-600 dark:text-blue-400',
        iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        defaultTitle: 'Information',
    },
    'rate-limit': {
        bg: 'bg-orange-500/10 dark:bg-orange-500/10',
        border: 'border-orange-500/20',
        icon: 'text-orange-500 dark:text-orange-400',
        title: 'text-orange-600 dark:text-orange-400',
        iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        defaultTitle: 'Rate Limited',
    },
    network: {
        bg: 'bg-purple-500/10 dark:bg-purple-500/10',
        border: 'border-purple-500/20',
        icon: 'text-purple-500 dark:text-purple-400',
        title: 'text-purple-600 dark:text-purple-400',
        iconPath: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
        defaultTitle: 'Network Error',
    },
    auth: {
        bg: 'bg-rose-500/10 dark:bg-rose-500/10',
        border: 'border-rose-500/20',
        icon: 'text-rose-500 dark:text-rose-400',
        title: 'text-rose-600 dark:text-rose-400',
        iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
        defaultTitle: 'Authentication Error',
    },
    validation: {
        bg: 'bg-yellow-500/10 dark:bg-yellow-500/10',
        border: 'border-yellow-500/20',
        icon: 'text-yellow-500 dark:text-yellow-400',
        title: 'text-yellow-600 dark:text-yellow-400',
        iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        defaultTitle: 'Validation Error',
    },
    session: {
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/10',
        border: 'border-cyan-500/20',
        icon: 'text-cyan-500 dark:text-cyan-400',
        title: 'text-cyan-600 dark:text-cyan-400',
        iconPath: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        defaultTitle: 'Session Error',
    },
};

export function ErrorDisplay({
    title,
    message,
    retry,
    dismiss,
    type = 'error',
    errorCode,
    details,
    retryAfter,
}: ErrorDisplayProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [countdown, setCountdown] = useState(retryAfter || 0);
    const [copied, setCopied] = useState(false);

    const config = typeConfig[type];
    const displayTitle = title || config.defaultTitle;

    // Countdown timer for rate limits
    useEffect(() => {
        if (type === 'rate-limit' && retryAfter && retryAfter > 0) {
            setCountdown(retryAfter);
            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [type, retryAfter]);

    const copyErrorDetails = useCallback(() => {
        const errorInfo = {
            type,
            title: displayTitle,
            message,
            errorCode,
            details,
            timestamp: new Date().toISOString(),
        };
        navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [type, displayTitle, message, errorCode, details]);

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    };

    return (
        <div className={`${config.bg} border ${config.border} rounded-lg p-4 transition-all duration-200`}>
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`${config.icon} mt-0.5 flex-shrink-0`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={config.iconPath} />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold ${config.title}`}>{displayTitle}</h4>
                        {errorCode && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono">
                                {errorCode}
                            </span>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>

                    {/* Rate limit countdown */}
                    {type === 'rate-limit' && countdown > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-orange-500 h-full transition-all duration-1000"
                                    style={{
                                        width: `${((retryAfter || 0) - countdown) / (retryAfter || 1) * 100}%`
                                    }}
                                />
                            </div>
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 min-w-[50px] text-right">
                                {formatCountdown(countdown)}
                            </span>
                        </div>
                    )}

                    {/* Details section */}
                    {details && (
                        <div className="mt-2">
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                            >
                                <svg
                                    className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                                {showDetails ? 'Hide details' : 'Show details'}
                            </button>
                            {showDetails && (
                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                                    {details}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {retry && (
                            <button
                                onClick={retry}
                                disabled={type === 'rate-limit' && countdown > 0}
                                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                    type === 'rate-limit' && countdown > 0
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 text-white'
                                }`}
                            >
                                {type === 'rate-limit' && countdown > 0
                                    ? `Wait ${formatCountdown(countdown)}`
                                    : 'Try Again'}
                            </button>
                        )}
                        {dismiss && (
                            <button
                                onClick={dismiss}
                                className="text-sm px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                            >
                                Dismiss
                            </button>
                        )}
                        {(errorCode || details) && (
                            <button
                                onClick={copyErrorDetails}
                                className="text-sm px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-auto"
                                title="Copy error details"
                            >
                                {copied ? (
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ErrorPage({
    title = 'Something went wrong',
    message = 'An unexpected error occurred.',
    retry,
    type = 'error',
    errorCode,
}: {
    title?: string;
    message?: string;
    retry?: () => void;
    type?: ErrorType;
    errorCode?: string;
}) {
    const config = typeConfig[type];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A192F] flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <svg className={`w-10 h-10 ${config.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={config.iconPath} />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
                {errorCode && (
                    <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-2">
                        Error Code: {errorCode}
                    </p>
                )}
                <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                <div className="flex justify-center gap-3">
                    {retry && (
                        <button
                            onClick={retry}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}

// Toast notification system
interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'rate-limit';
    title?: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { ...toast, id };
        setToasts(prev => [...prev, newToast]);

        if (toast.duration !== 0) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration || 5000);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return { toasts, addToast, removeToast, clearAll };
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    if (toasts.length === 0) return null;

    const toastConfig: Record<Toast['type'], { bg: string; icon: string }> = {
        success: {
            bg: 'bg-green-600 dark:bg-green-500',
            icon: 'M5 13l4 4L19 7'
        },
        error: {
            bg: 'bg-red-600 dark:bg-red-500',
            icon: 'M6 18L18 6M6 6l12 12'
        },
        warning: {
            bg: 'bg-amber-600 dark:bg-amber-500',
            icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        },
        info: {
            bg: 'bg-blue-600 dark:bg-blue-500',
            icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        'rate-limit': {
            bg: 'bg-orange-600 dark:bg-orange-500',
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        },
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
            {toasts.map(toast => {
                const config = toastConfig[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`${config.bg} text-white p-4 rounded-lg shadow-xl flex items-start gap-3 animate-slide-up pointer-events-auto`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={config.icon} />
                        </svg>
                        <div className="flex-1 min-w-0">
                            {toast.title && (
                                <p className="font-semibold text-sm">{toast.title}</p>
                            )}
                            <p className="text-sm text-white/90">{toast.message}</p>
                            {toast.action && (
                                <button
                                    onClick={toast.action.onClick}
                                    className="mt-2 text-sm font-medium underline hover:no-underline"
                                >
                                    {toast.action.label}
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => onRemove(toast.id)}
                            className="text-white/70 hover:text-white flex-shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

// Helper to parse API errors
export function parseApiError(error: unknown): {
    type: ErrorType;
    message: string;
    errorCode?: string;
    retryAfter?: number;
} {
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
        const status = (error as Response).status;

        if (status === 429) {
            const retryAfter = parseInt((error as Response).headers?.get('Retry-After') || '60', 10);
            return {
                type: 'rate-limit',
                message: 'Too many requests. Please wait before trying again.',
                errorCode: 'RATE_LIMIT',
                retryAfter,
            };
        }

        if (status === 401 || status === 403) {
            return {
                type: 'auth',
                message: 'You are not authorized to perform this action.',
                errorCode: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
            };
        }

        if (status === 400) {
            return {
                type: 'validation',
                message: 'Invalid request. Please check your input.',
                errorCode: 'BAD_REQUEST',
            };
        }

        if (status >= 500) {
            return {
                type: 'error',
                message: 'Server error. Please try again later.',
                errorCode: `SERVER_ERROR_${status}`,
            };
        }
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
            type: 'network',
            message: 'Unable to connect to the server. Please check your internet connection.',
            errorCode: 'NETWORK_ERROR',
        };
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { type: 'error', message };
}
