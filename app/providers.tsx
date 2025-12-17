'use client';

import dynamic from "next/dynamic";

// Dynamically import components that use hooks to avoid SSR issues
const SessionProviderWrapper = dynamic(
    () => import("./components/SessionProviderWrapper"),
    { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProviderWrapper>
            {children}
        </SessionProviderWrapper>
    );
}
