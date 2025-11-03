"use client";

import React, { useState } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";
import Session from "supertokens-web-js/recipe/session";
import { TRPCRouter } from "@/src/server/trpc";
import { AUTH_ERROR_CODES } from "@/src/server/trpc/authErrorCodes";
import { TRPCProvider } from "./trpc.client";

/**
 * The time in milliseconds that a query will be considered fresh.
 * @note useStreetViewQuery has its own stale time of 1 hour.
 */
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GENERIC_ERROR_MSG = "Oof! An error occured";

type NotifyShowOptions = { severity: "error"; autoHideDuration: number };
type NotifyLike =
    | { show?: (msg: string, options: NotifyShowOptions) => void }
    | undefined;

/**
 * If you have some kind of toast, pass its function here. This is to ensure
 * we have toast support for mutations on a global level.
 */
function makeQueryClient(notify?: NotifyLike) {
    return new QueryClient({
        defaultOptions: {
            queries: {
                gcTime: STALE_TIME,
                staleTime: STALE_TIME,
                refetchOnWindowFocus: false,
                retry: false,
            },
            mutations: {
                // global onError handler
                onError: (err: any) => {
                    console.error("🛑 Client Error ", err);
                    if (notify && typeof notify.show === "function") {
                        notify.show(GENERIC_ERROR_MSG, {
                            severity: "error",
                            autoHideDuration: 10000,
                        });
                    }
                },
            },
            dehydrate: {
                serializeData: SuperJSON.serialize,
                shouldRedactErrors: () => {
                    // We should not catch Next.js server errors
                    // as that's how Next.js detects dynamic pages
                    // so we cannot redact them.
                    // Next.js also automatically redacts errors for us
                    // with better digests.
                    return false;
                },
            },
            hydrate: {
                deserializeData: SuperJSON.deserialize,
            },
        },
    });
}
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(notify?: NotifyLike) {
    if (typeof window === "undefined") {
        // Server: always make a new query client
        return makeQueryClient(notify);
    } else {
        // Browser: make a new query client if we don't already have one
        // This is very important, so we don't re-make a new client if React
        // suspends during the initial render. This may not be needed if we
        // have a suspense boundary BELOW the creation of the query client
        // Thanks to T3 stack for this
        if (!browserQueryClient) browserQueryClient = makeQueryClient(notify);
        return browserQueryClient;
    }
}

function getHttpBatchLink() {
    const baseUrl =
        typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";
    return `${baseUrl}/api/trpc`;
}

export function TrpcTanstackProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const queryClient = getQueryClient();
    const [trpcClient] = useState(() =>
        createTRPCClient<TRPCRouter>({
            links: [
                loggerLink({
                    enabled: (op) =>
                        process.env.NODE_ENV === "development" ||
                        (op.direction === "down" && op.result instanceof Error),
                }),
                httpBatchLink({
                    url: getHttpBatchLink(),
                    transformer: require("superjson"),
                    fetch: async (url, options) => {
                        try {
                            const response = await fetch(url, options);

                            // Check if response contains auth errors
                            if (!response.ok) {
                                const errorData = await response.clone().json();

                                if (
                                    errorData?.error?.data?.cause?.type ===
                                    AUTH_ERROR_CODES.NEEDS_REFRESH
                                ) {
                                    // Try to refresh and retry once
                                    if (
                                        await Session.attemptRefreshingSession()
                                    ) {
                                        // Retry the request with refreshed tokens
                                        return fetch(url, options);
                                    } else {
                                        // Refresh failed, redirect to login
                                        window.location.href =
                                            "/?refreshFailed=true"; // TODO change this to something more appropriate
                                        throw new Error(
                                            "Session refresh failed"
                                        );
                                    }
                                }
                            }

                            return response;
                        } catch (error) {
                            console.error("tRPC request failed:", error);
                            throw error;
                        }
                    },
                }),
            ],
        })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
                {children}
            </TRPCProvider>
        </QueryClientProvider>
    );
}
