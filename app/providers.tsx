'use client';

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import { MobileWarning } from "./components/MobileWarning";

export function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <SessionProvider>
            {mounted && <MobileWarning />}
            {children}
        </SessionProvider>
    );
}
