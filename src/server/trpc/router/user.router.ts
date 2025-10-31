import type { TRPCRouterRecord } from "@trpc/server";
import { protectedUserProcedure, publicUserProcedure } from "../trpc";
import { Schema } from "@/lib/validation/Schema";

export const userRouter = {
    getContactInfo: publicUserProcedure.query(({ ctx }) =>
        ctx.handler.getContactInfo()
    ),

    getUserPreferences: protectedUserProcedure.query(({ ctx }) =>
        ctx.handler.getUserPreferences()
    ),

    editContactInfo: protectedUserProcedure
        .input(Schema.users.patchContactInfo)
        .mutation(({ ctx, input }) => ctx.handler.editContactInfo({ input })),

    editUserPreferences: protectedUserProcedure
        .input(Schema.users.editUserPreferences)
        .mutation(({ ctx, input }) =>
            ctx.handler.editUserPreferences({ input })
        ),
} satisfies TRPCRouterRecord;
