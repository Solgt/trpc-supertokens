import { TRPCError } from "@trpc/server";
import z from "zod";
import { BaseHandler, BaseHandlerPublic } from "./base.handlers";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import SuperTokens from "supertokens-node";
import { UserMetadataPayload } from "../../validation/schema.users";
import { Validation } from "../../validation";

export class UserHandlerPublic extends BaseHandlerPublic {
    public async getUserInfo() {
        if (!this.ctx.session.supertokensId) {
            return null;
        }

        const user = await SuperTokens.getUser(this.ctx.session.supertokensId);

        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }

        return user;
    }
}

export class UserHandler extends BaseHandler {
    public async getUserMetadata() {
        const { status, metadata } = await UserMetadata.getUserMetadata(
            this.ctx.session.supertokensId
        );

        if (status !== "OK") {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Status from SuperTokens was not OK",
            });
        }

        return metadata as UserMetadataPayload;
    }

    public async editUserMetadata({
        input,
    }: {
        input: z.infer<typeof Validation.user.metadata>;
    }) {
        const { status, metadata } = await UserMetadata.updateUserMetadata(
            this.ctx.session.supertokensId,
            input
        );

        if (status !== "OK") {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Status from SuperTokens was not OK",
            });
        }

        return metadata as UserMetadataPayload;
    }
}
