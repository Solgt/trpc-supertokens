import z from "zod/v3";

export class User {
    static metadata = z.object({
        personalData: z
            .object({
                name: z.string().nullish(),
                emails: z.array(z.string()).nullish(),
                address: z.any().nullish(),
                phoneNumber: z.string().nullish(),
            })
            .optional(),
        preferences: z
            .object({
                theme: z.string().nullish(),
                notifications: z.boolean().nullish(),
                consent: z.boolean().nullish(),
            })
            .optional(),
    });
}

export type UserMetadataPayload = z.infer<typeof User.metadata>;
