# SuperTokens + tRPC + Next

A demo implementation of [SuperTokens](https://supertokens.com/) with [Next.js](https://nextjs.org/) and [tRPC](https://trpc.io/).

## General Info

This project aims to demonstrate how to integrate SuperTokens into a Nexjs application with tRPC and ensure that Supertoken's session refreshing mechanisms remain intact with the API flow. Its primary purpose is to serve as an educational tool.

This project was bootstrapped with `npx create-supertokens-app@latest` but amended to use the `src` directory.

## Relevant tRPC structure

### Frontend

-   `components/trpc/trpcTanstack.provider.tsx` contains the necessary Tanstack Query and tRPC providers for the query client and hooks. Put this up high in your application.
    -   It contains crucial code for optimal functioning with SuperTokens. During unauthenticed requests, a refresh code is sent from the tRPC router and intercepted here, where a session refresh is attempted once followed by a request retry.
-   `components/trpc/trpc.client.ts` exposes the tRPC provider and hooks.
-   `hooks/useUser.ts` example hook for user queries and mutations.
-   `hooks/useSessionCheck.ts` helper hook for checking session exists.

### Backend

-   `server/trpc/trpc.ts` Main tRPC configuration.
    -   It contains crucial code for optimal functioning with SuperTokens. During unauthenticed requests, a refresh code (custom status code) is sent from tRPC here and intercepted at the frontend, which triggers a session refresh.
-   `server/trpc/root.ts` Main collection point for tRPC routers.
-   `server/trpc/index.ts` Re-export of tRPC internals and helper types.
-   `server/trpc/authErrorCodes.ts` Custom auth error states and directives.
-   `server/trpc/router` Directory for tRPC routers.
-   `server/trpc/handlers` API handlers. Split by procedure which contains relevant context.

API handlers are attached to a public or protected procedure, the latter which guarantees the user is logged in at the time of the request (other context dependencies can be added here, such as db adapters). Routers only contain router-logic and wire the relevant procedures to handlers. This allows for easier oversight over API routes and isolating business logic to respective handlers.

## Acknowledgements

-   [SuperTokens](https://supertokens.com/)
-   [tRPC](https://trpc.io/)
-   [Next.js](https://nextjs.org/)
-   [Zod](https://zod.dev/)
-   [React.js](https://react.dev/)

## Authors

Firgrep
