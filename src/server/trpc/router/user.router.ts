import type { TRPCRouterRecord } from "@trpc/server";
import { protectedUserProcedure, publicUserProcedure } from "../trpc";
import { Validation } from "../../validation";

export const userRouter = {
    getInfo: publicUserProcedure.query(({ ctx }) => ctx.handler.getUserInfo()),

    getMetadata: protectedUserProcedure.query(({ ctx }) =>
        ctx.handler.getUserMetadata()
    ),

    editMetadata: protectedUserProcedure
        .input(Validation.user.metadata)
        .mutation(({ ctx, input }) => ctx.handler.editUserMetadata({ input })),
} satisfies TRPCRouterRecord;
