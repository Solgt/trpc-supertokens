"use client";

import { signOut } from "supertokens-auth-react/recipe/session";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "../trpc/trpc.client";
import { useUser } from "@/src/hooks/useUser";
import { UserMetadataPayload } from "@/src/server/validation/schema.users";
import { useState } from "react";
import { Validation } from "@/src/server/validation";

export default function DashboardClient() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useTRPC();
    const { metadataQ, editMetadata } = useUser();

    const handleUserClick = async () => {
        const userInfoResponse = await queryClient.fetchQuery(
            user.getInfo.queryOptions()
        );

        if (!userInfoResponse) {
            alert("Response was null");
            return;
        }

        alert(JSON.stringify(userInfoResponse));
    };

    const handleMetadataClick = async () => {
        const userInfoResponse = await queryClient.fetchQuery(
            user.getMetadata.queryOptions()
        );

        if (!userInfoResponse) {
            alert("Response was null");
            return;
        }

        alert(JSON.stringify(userInfoResponse));
    };

    async function logoutClicked() {
        await signOut();
        router.push("/");
    }

    return (
        <div>
            <div>
                <h3>Your metadata</h3>
                <pre>{JSON.stringify(metadataQ.data, null, 2)}</pre>
            </div>

            <div className="buttons">
                <button onClick={handleUserClick} className="dashboard-button">
                    Call User API
                </button>
                <button
                    onClick={handleMetadataClick}
                    className="dashboard-button"
                >
                    Call Metadata API
                </button>
                <button onClick={logoutClicked} className="dashboard-button">
                    Logout
                </button>
            </div>

            <MetadataForm />
        </div>
    );
}

export function MetadataForm() {
    const { metadataQ, editMetadata } = useUser();
    const [formData, setFormData] = useState<UserMetadataPayload>({
        personalData: {
            name: metadataQ.data?.personalData?.name ?? "",
            emails: metadataQ.data?.personalData?.emails || [""],
            address: metadataQ.data?.personalData?.address ?? "",
            phoneNumber: metadataQ.data?.personalData?.phoneNumber ?? "",
        },
        preferences: {
            theme: metadataQ.data?.preferences?.theme ?? "",
            notifications: metadataQ.data?.preferences?.notifications ?? false,
            consent: metadataQ.data?.preferences?.consent ?? false,
        },
    });

    const handleEmailChange = (index: number, value: string) => {
        const newEmails = [...(formData.personalData?.emails || [""])];
        newEmails[index] = value;
        setFormData({
            ...formData,
            personalData: { ...formData.personalData, emails: newEmails },
        });
    };

    const addEmail = () => {
        setFormData({
            ...formData,
            personalData: {
                ...formData.personalData,
                emails: [...(formData.personalData?.emails || []), ""],
            },
        });
    };

    const removeEmail = (index: number) => {
        const newEmails = formData.personalData?.emails?.filter(
            (_, i) => i !== index
        );
        setFormData({
            ...formData,
            personalData: { ...formData.personalData, emails: newEmails },
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = Validation.user.metadata.safeParse(formData);

        if (!result.success) {
            console.error("Validation failed:", result.error);
            return;
        }

        editMetadata.mutate(formData, {
            onSuccess: () => alert("Success"),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <h1>Metadata Form</h1>
            {/* Personal Data Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Personal Data</h2>

                <div>
                    <label className="block mb-1">Name</label>
                    <input
                        type="text"
                        value={formData.personalData?.name || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                personalData: {
                                    ...formData.personalData,
                                    name: e.target.value,
                                },
                            })
                        }
                        className="w-full border rounded px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block mb-1">Emails</label>
                    {formData.personalData?.emails?.map((email, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    handleEmailChange(index, e.target.value)
                                }
                                className="flex-1 border rounded px-3 py-2"
                            />
                            {formData.personalData!.emails!.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEmail(index)}
                                    className="px-3 py-2 bg-red-500 text-white rounded"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addEmail}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Add Email
                    </button>
                </div>

                <div>
                    <label className="block mb-1">Address</label>
                    <textarea
                        value={formData.personalData?.address || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                personalData: {
                                    ...formData.personalData,
                                    address: e.target.value,
                                },
                            })
                        }
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block mb-1">Phone Number</label>
                    <input
                        type="tel"
                        value={formData.personalData?.phoneNumber || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                personalData: {
                                    ...formData.personalData,
                                    phoneNumber: e.target.value,
                                },
                            })
                        }
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Preferences</h2>

                <div>
                    <label className="block mb-1">Theme</label>
                    <select
                        value={formData.preferences?.theme || ""}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                preferences: {
                                    ...formData.preferences,
                                    theme: e.target.value,
                                },
                            })
                        }
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="">Select theme</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.preferences?.notifications || false}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                preferences: {
                                    ...formData.preferences,
                                    notifications: e.target.checked,
                                },
                            })
                        }
                        className="w-4 h-4"
                    />
                    <label>Enable Notifications</label>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.preferences?.consent || false}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                preferences: {
                                    ...formData.preferences,
                                    consent: e.target.checked,
                                },
                            })
                        }
                        className="w-4 h-4"
                    />
                    <label>I consent to data processing</label>
                </div>
            </div>

            <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded"
            >
                Save Metadata
            </button>
        </form>
    );
}
