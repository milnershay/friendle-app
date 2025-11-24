"use client";

import { useAuth } from "@/hooks/useAuth";

export default function AuthWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { loading } = useAuth();

    // This is a bit of a hack, but it's the easiest way to get the loading state
    // into the body tag for our e2e tests to read.
    if (typeof window !== "undefined") {
        if (loading) {
            document.body.setAttribute("data-loading", "true");
        } else {
            document.body.removeAttribute("data-loading");
        }
    }

    return <>{children}</>;
}
