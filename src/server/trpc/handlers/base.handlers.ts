import type { ProtectedCtx, PublicCtx } from "../trpc";

/**
 * A base class for all handlers that need access to the *protected* tRPC context.
 * The context is passed to the constructor.
 * @protected
 */
export abstract class BaseHandler {
    protected readonly ctx: ProtectedCtx;

    constructor(ctx: ProtectedCtx) {
        this.ctx = ctx;
    }

    protected ensureAuthenticated() {
        if (!this.ctx.session) {
            throw new Error("User not authenticated.");
        }
    }
}

/**
 * A base class for all handlers that need access to the *public* tRPC context.
 * The context is passed to the constructor.
 * @public
 */
export abstract class BaseHandlerPublic {
    protected readonly ctx: PublicCtx;

    constructor(ctx: PublicCtx) {
        this.ctx = ctx;
    }
}
