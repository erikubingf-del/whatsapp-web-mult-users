'use client';

import { SessionProvider } from "next-auth/react";
import { MobileWarning } from "./MobileWarning";

export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <MobileWarning />
            {children}
        </SessionProvider>
    );
}
