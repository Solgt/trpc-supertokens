import {
    inferProcedureBuilderResolverOptions,
    initTRPC,
    TRPCError,
} from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";
import { NextRequest } from "next/server";
import { getSSRSession } from "supertokens-node/nextjs";
import { AUTH_ERROR_CODES } from "./authErrorCodes";
import { UserHandler, UserHandlerPublic } from "./handlers/user.handlers";
import { ensureSuperTokensInit } from "@/src/config/backendConfigUtils";

ensureSuperTokensInit();

/**
 * Add artificial delay for processing responses to simulate real conditions.
 *
 * @note Always disabled in production.
 */
const USE_TIMED_DELAY = false;

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { req: NextRequest }) => {
    const cookies = opts.req.cookies?.getAll() || [];
    const { accessTokenPayload, hasToken } = await getSSRSession(cookies);

    // For public procedure, we attempt refresh only if there are tokens.
    if (accessTokenPayload === undefined && hasToken) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Session expired, refresh required",
            // Custom metadata to help client handle this
            cause: {
                type: AUTH_ERROR_CODES.NEEDS_REFRESH,
                hasToken: true,
            },
        });
    }

    return {
        req: opts.req,
        session: {
            supertokensId: accessTokenPayload?.sub,
        },
    };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
    errorFormatter: ({ shape, error }) => ({
        ...shape,
        data: {
            ...shape.data,
            zodError:
                error.cause instanceof ZodError
                    ? z.flattenError(
                          error.cause as ZodError<Record<string, unknown>>
                      )
                    : null,
        },
    }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
    const start = Date.now();
    const waitMs = Math.floor(Math.random() * 400) + 100;

    if (t._config.isDev) {
        // artificial delay in dev 100-500ms
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const result = await next();

    const end = Date.now();

    if (t._config.isDev) {
        console.info(
            `[TRPC] ${path} took ${
                end - start
            }ms to execute. Artificial ${waitMs}ms. Real ${
                end - start - waitMs
            }ms`
        );
    }

    return result;
});

const baseProcedure = USE_TIMED_DELAY
    ? t.procedure.use(timingMiddleware)
    : t.procedure;

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = baseProcedure;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * In order to make this work with Supertokens, we must check the cookies and respond with custom error codes,
 * these are then handled by trpc client-side.
 *
 * @see https://trpc.io/docs/procedures
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
    try {
        const cookies = ctx.req.cookies?.getAll() || [];
        // eslint-disable-next-line prefer-const
        let { accessTokenPayload, error, hasToken } = await getSSRSession(
            cookies
        );

        if (error) {
            console.error("Session verification error:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Session verification failed",
            });
        }

        // If no access token but we have tokens, attempt client-side refresh
        if (accessTokenPayload === undefined && hasToken) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Session expired, refresh required",
                // Custom metadata to help client handle this
                cause: {
                    type: AUTH_ERROR_CODES.NEEDS_REFRESH,
                    hasToken: true,
                },
            });
        }

        // No tokens at all - user needs to log in
        if (accessTokenPayload === undefined) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Authentication required",
                cause: {
                    type: AUTH_ERROR_CODES.FORBIDDEN,
                    hasToken: false,
                },
            });
        }

        return next({
            ctx: {
                session: {
                    supertokensId: accessTokenPayload.sub!,
                },
            },
        });
    } catch (error) {
        if (error instanceof TRPCError) {
            throw error;
        }

        console.error("Unexpected authentication error:", error);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Authentication failed",
        });
    }
});

export const protectedProcedure = baseProcedure.use(isAuthenticated);

type ProtectedProcedureOptions = inferProcedureBuilderResolverOptions<
    typeof protectedProcedure
>;
type PublicProcedureOptions = inferProcedureBuilderResolverOptions<
    typeof publicProcedure
>;

export type ProtectedCtx = ProtectedProcedureOptions["ctx"];
export type PublicCtx = PublicProcedureOptions["ctx"];

export const publicUserProcedure = publicProcedure.use(({ ctx, next }) => {
    return next({
        ctx: {
            ...ctx,
            handler: new UserHandlerPublic(ctx),
        },
    });
});

export const protectedUserProcedure = protectedProcedure.use(
    ({ ctx, next }) => {
        return next({
            ctx: {
                ...ctx,
                handler: new UserHandler(ctx),
            },
        });
    }
);
