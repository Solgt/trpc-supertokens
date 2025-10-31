import { TRPCRouter } from "@/src/server/trpc";
import { createTRPCContext } from "@trpc/tanstack-react-query";

export const { TRPCProvider, useTRPC, useTRPCClient } =
    createTRPCContext<TRPCRouter>();
