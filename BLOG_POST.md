# SuperTokens + tRPC + Next.js

> A step‑by‑step walkthrough of wiring SuperTokens sessions into a Next.js app that uses tRPC and TanStack Query — with resilient, automatic refresh and clean separation of API logic.

[Demo Repo](https://github.com/Solgt/trpc-supertokens)

---

## Why this stack?

-   **tRPC** lets us define type‑safe backend routers and call them from the client with end‑to‑end types. Great DX.
-   **SuperTokens** handles auth/session with refresh tokens, CSRF protection, and battle‑tested flows.
-   **Next.js** gives us file‑based routing and server components.
-   **TanStack Query** powers caching, retries, and de/serialization for our procedure calls.

Together, they can feel “click‑together”, APIs and data flows that align so well that the integration feels smooth—if you respect how **session refresh** and **API error handling** flow. That’s what this guide focuses on.

---

## The core idea

1. **Backend**: every tRPC request constructs context from the incoming `NextRequest` and cookies. If a session is missing **but refresh is still possible**, the server replies with a _custom_ auth error code (not a redirect), signalling the client to attempt a refresh.
2. **Client**: the tRPC client intercepts that custom error, calls `Session.attemptRefreshingSession()`, and retries the original request **once**. If it fails, we send the user to login.

This handshake preserves tRPC’s ergonomics (no manual `fetch` juggling) while keeping SuperTokens’ refresh semantics intact.

---

## Project layout (high‑level)

**Frontend**

-   `components/trpc/trpcTanstack.provider.tsx` – wraps your app with TanStack Query + tRPC providers and wires the _refresh‑on‑custom‑error_ logic.
-   `components/trpc/trpc.client.ts` – exports a typed `TRPCProvider` and hooks.
-   `hooks/useUser.ts` – example hooks for user queries/mutations.
-   `hooks/useSessionCheck.ts` – quick “is there a session?” helper.

**Backend**

-   `server/trpc/trpc.ts` – tRPC init + context creation + protected/public procedures + error formatting.
-   `server/trpc/root.ts` – top‑level router.
-   `server/trpc/index.ts` – re‑exports types and helpers.
-   `server/trpc/authErrorCodes.ts` – custom auth error codes used by both sides.
-   `server/trpc/router/*` – routers organized by domain.
-   `server/trpc/handlers/*` – business logic in composable handler classes.

This separation keeps **routing skinny** and **handlers focused**.

---

## The custom auth signal

Create a small shared enum that both client and server import:

```ts
// server/trpc/authErrorCodes.ts
export const AUTH_ERROR_CODES = {
    NEEDS_REFRESH: "NEEDS_REFRESH",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;
```

We’ll use `NEEDS_REFRESH` to tell the client: “You’ve got cookies; your access token is stale; try refreshing.”

---

## Server: building the context

The server inspects cookies to determine whether we can refresh _without_ blindly rejecting the request. With SuperTokens, `getSSRSession` reads and verifies session cookies in an SSR‑safe way.

```ts
// server/trpc/trpc.ts (excerpt)
import { getSSRSession } from "supertokens-node/nextjs";
import { AUTH_ERROR_CODES } from "./authErrorCodes";
import { TRPCError } from "@trpc/server";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
    const cookies = opts.req.cookies?.getAll() || [];
    const { accessTokenPayload, hasToken } = await getSSRSession(cookies);

    // User has tokens but access token is missing/expired → ask client to refresh
    if (accessTokenPayload === undefined && hasToken) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session expired, refresh required",
            cause: { type: AUTH_ERROR_CODES.NEEDS_REFRESH, hasToken: true },
        });
    }

    return {
        req: opts.req,
        session: { supertokensId: accessTokenPayload?.sub },
    };
};
```

### Authenticated procedure middleware

For protected routes, we first make a reusable base authenticated procedure, repeat the pattern and give sharper errors:

```ts
// server/trpc/trpc.ts (excerpt)
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
    const cookies = ctx.req.cookies?.getAll() || [];
    const { accessTokenPayload, error, hasToken } = await getSSRSession(
        cookies
    );

    if (error) {
        console.error("Session verification error:", error);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Session verification failed",
        });
    }

    if (accessTokenPayload === undefined && hasToken) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session expired, refresh required",
            cause: { type: AUTH_ERROR_CODES.NEEDS_REFRESH, hasToken: true },
        });
    }

    if (accessTokenPayload === undefined) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
            cause: { type: AUTH_ERROR_CODES.FORBIDDEN, hasToken: false },
        });
    }

    return next({
        ctx: { session: { supertokensId: accessTokenPayload.sub! } },
    });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const publicProcedure = t.procedure;

// See example of handlers tied to specific procedues below
```

> Tip: by attaching _domain handlers_ in middleware (e.g., `handler: new UserHandler(ctx)`), your routers stay declarative and business logic lives in testable classes.

---

## Client: intercept, refresh, retry

We build a single tRPC client that adds a `fetch` wrapper inside `httpBatchLink`. When the server returns `NEEDS_REFRESH`, the client calls SuperTokens’ refresh and retries **once**.

```tsx
// components/trpc/trpcTanstack.provider.tsx (excerpt)
import Session from "supertokens-web-js/recipe/session";
import { AUTH_ERROR_CODES } from "@/src/server/trpc/authErrorCodes";

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
                httpBatchLink({
                    url: getHttpBatchLink(),
                    transformer: require("superjson"),
                    fetch: async (url, options) => {
                        const response = await fetch(url, options);
                        if (!response.ok) {
                            const errorData = await response
                                .clone()
                                .json()
                                .catch(() => undefined);
                            const type = errorData?.error?.data?.cause?.type;
                            if (type === AUTH_ERROR_CODES.NEEDS_REFRESH) {
                                if (await Session.attemptRefreshingSession()) {
                                    return fetch(url, options); // retry once after refresh
                                }
                                window.location.href = "/?refreshFailed=true"; // TODO: change this to something more appropriate
                                throw new Error("Session refresh failed");
                            }
                        }
                        return response;
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
```

The result: _transparent_ refresh during normal app usage. Your components keep using tRPC hooks as if nothing happened.

---

## TanStack Query setup

Use a single `QueryClient` with SuperJSON (de)serialization and a global mutation error handler for toasts/logging. Keep one browser client instance across suspense boundaries.

```ts
const STALE_TIME = 5 * 60 * 1000;

function makeQueryClient(notify?: {
    show?: (
        msg: string,
        opts: { severity: "error"; autoHideDuration: number }
    ) => void;
}) {
    return new QueryClient({
        defaultOptions: {
            queries: {
                gcTime: STALE_TIME,
                staleTime: STALE_TIME,
                refetchOnWindowFocus: false,
                retry: false,
            },
            mutations: {
                onError: (err: unknown) => {
                    console.error("🛑 Client Error", err);
                    notify?.show?.("Oof! An error occured", {
                        severity: "error",
                        autoHideDuration: 10_000,
                    });
                },
            },
            dehydrate: {
                serializeData: SuperJSON.serialize,
                shouldRedactErrors: () => false,
            },
            hydrate: { deserializeData: SuperJSON.deserialize },
        },
    });
}
```

---

## Routers vs. handlers

Keep routers declarative:

```ts
// server/trpc/root.ts
export const trpcRouter = createTRPCRouter({
    user: userRouter,
});
export type TRPCRouter = typeof trpcRouter;
```

Attach _handler_ instances via middleware so each procedure receives the right business service and that service has the necessary context:

```ts
export const publicUserProcedure = publicProcedure.use(({ ctx, next }) =>
    next({ ctx: { ...ctx, handler: new UserHandlerPublic(ctx) } })
);

export const protectedUserProcedure = protectedProcedure.use(({ ctx, next }) =>
    next({ ctx: { ...ctx, handler: new UserHandler(ctx) } })
);
```

This makes it easy to swap adapters (DB, messaging, etc.) and keep auth concerns centralized.

---

## End‑to‑end typing helpers

Export the inferred input/output types once and then import them in your components/tests:

```ts
// server/trpc/index.ts
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { trpcRouter, TRPCRouter } from "./root";

export type TRPCInputs = inferRouterInputs<TRPCRouter>;
export type TRPCOutputs = inferRouterOutputs<TRPCRouter>;
export { trpcRouter };
```

---

## Common pitfalls (and fixes)

1. **Refreshing on the server**: don’t. In this model, let the _client_ trigger refresh on a specific custom signal. Server stays stateless and fast.
2. **Hiding the signal with a 302**: tRPC expects structured errors; use `TRPCError` with a `cause` that includes your `NEEDS_REFRESH` code.
3. **Infinite retry loops**: retry the request **once** after refresh. If it still fails, route to login.
4. **Mixed serialization**: use SuperJSON on both the link and the tRPC server `transformer`.
5. **QueryClient re‑creation**: memoize the client in the browser; otherwise, cache/race issues surface under Suspense.

---

## Testing the flow

-   Expire an access token (or set very low TTL in a dev recipe).
-   Call a **protected** procedure from the UI.
-   Confirm the server responds with `UNAUTHORIZED` and `cause.type = NEEDS_REFRESH`.
-   Confirm the client runs `attemptRefreshingSession()` and then **retries** the same request once.
-   If refresh is revoked/invalid → user is sent to login.

---

## Security notes

-   Keep **CSRF protection** enabled (SuperTokens defaults are good).
-   Scope cookies correctly for your domain and set `sameSite` appropriately.
-   Avoid leaking whether a user exists during public operations; keep errors generic.
-   Log auth errors on the server, but don’t include secrets or raw tokens.

---

## Wrapping up

With a tiny shared enum and a disciplined error flow, you get a UX where sessions silently refresh and your React code keeps calling `trpc.user.get.useQuery()` like any other data hook. The server remains clean, testable, and decoupled from UI concerns.

You can find all the code used in this blog post and test it for yourself at [the demo repo](https://github.com/Solgt/trpc-supertokens).

---

## Appendix: minimal checklist

-   [ ] `AUTH_ERROR_CODES` shared by server & client
-   [ ] tRPC `transformer: superjson` on both ends
-   [ ] `createTRPCContext` checks `getSSRSession(cookies)` and throws `NEEDS_REFRESH` when appropriate
-   [ ] `protectedProcedure` middleware enforces auth and emits `FORBIDDEN` when unauthenticated
-   [ ] Client `httpBatchLink.fetch` branch: refresh → retry once → redirect if fails
-   [ ] Single `QueryClient` instance in the browser
-   [ ] Routers thin, handlers hold business logic

**Acknowledgements**: SuperTokens · tRPC · Next.js · Zod · React

**Author**: Filip Niklas / Firgrep
