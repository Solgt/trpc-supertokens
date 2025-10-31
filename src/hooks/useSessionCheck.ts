"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

export function useSessionCheck() {
    const queryClient = useQueryClient();
    const path = usePathname();
    const isCalledRef = useRef(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [authenticated, setAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        async function validateSession() {
            if (isCalledRef.current === true) return;

            try {
                isCalledRef.current = true; // Prevent rerunning in dev mode.

                // Check if session exists. ST will automatically attempt to refresh the session if it's expired.
                if (await Session.doesSessionExist()) {
                    setAuthenticated(true);
                }
            } catch (e) {
                setAuthenticated(false);
                throw e;
            } finally {
                setLoading(false);
                isCalledRef.current = false;
            }
        }

        validateSession();
    }, [path, queryClient]);

    return {
        loading,
        authenticated,
        isSuccess: !loading && authenticated,
    };
}
