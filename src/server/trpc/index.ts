import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCContext } from "./trpc";
import { trpcRouter, TRPCRouter } from "./root";

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
type TRPCInputs = inferRouterInputs<TRPCRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
type TRPCOutputs = inferRouterOutputs<TRPCRouter>;

export { createTRPCContext, trpcRouter };
export type { TRPCRouter, TRPCInputs, TRPCOutputs };
