'use client';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'md', message, fullScreen = false }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-3',
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={`${sizeClasses[size]} border-cyan-500 border-t-transparent rounded-full animate-spin`}
            />
            {message && (
                <p className="text-slate-400 text-sm animate-pulse">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-[#0A192F] flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
}

export function LoadingOverlay({ message }: { message?: string }) {
    return (
        <div className="absolute inset-0 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center z-40">
            <LoadingSpinner size="lg" message={message} />
        </div>
    );
}

export function LoadingCard() {
    return (
        <div className="bg-slate-800/50 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3"></div>
        </div>
    );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-4 animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-slate-700 rounded w-16"></div>
                </div>
            ))}
        </div>
    );
}
