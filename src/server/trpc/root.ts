import { userRouter } from "./router/user.router";
import { createTRPCRouter } from "./trpc";

/**
 * Main trpc router. Add sub-routers here.
 */
export const trpcRouter = createTRPCRouter({
    user: userRouter,
});

// export type definition of API
export type TRPCRouter = typeof trpcRouter;
