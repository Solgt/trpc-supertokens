import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { TRPCError } from "@trpc/server";
import { createTRPCContext, trpcRouter } from "@/src/server/trpc";
import { AUTH_ERROR_CODES } from "@/src/server/trpc/authErrorCodes";

export const dynamic = "force-dynamic";

// TODO set your allowed origin domain here
const domain = "*";

const setCorsHeaders = (res: Response) => {
    res.headers.set("Access-Control-Allow-Origin", `${domain}`);
    res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Type"
    );
    res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-trpc-source"
    );
};

export const OPTIONS = () => {
    const response = new Response(null, {
        status: 204,
    });
    setCorsHeaders(response);
    return response;
};

const handler = async (req: NextRequest) => {
    const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        router: trpcRouter,
        req,
        createContext: () =>
            createTRPCContext({
                req,
            }),
        onError: ({ error, path, input, type }) => {
            // Don't log expected authentication errors
            if (
                error instanceof TRPCError &&
                error.code === "UNAUTHORIZED" &&
                error.cause &&
                typeof error.cause === "object" &&
                "type" in error.cause &&
                (error.cause.type === AUTH_ERROR_CODES.NEEDS_REFRESH ||
                    error.cause.type === AUTH_ERROR_CODES.FORBIDDEN)
            ) {
                // Only log in development for debugging
                if (process.env.NODE_ENV === "development") {
                    console.debug(
                        `🔄 Expected auth error on ${path}: ${error.message}`
                    );
                }
                return;
            }

            // Also check for the SilentTRPCError if you're using that approach
            if ("silent" in error && error.silent === true) {
                if (process.env.NODE_ENV === "development") {
                    console.debug(
                        `🔇 Silent auth error on ${path}: ${error.message}`
                    );
                }
                return;
            }

            // Log all other errors normally
            console.error(`❌ tRPC Error on '${path}' ${error.message}`, {
                error,
                path,
                input,
                type,
            });
        },
    });

    setCorsHeaders(response);
    return response;
};

export { handler as GET, handler as POST };
