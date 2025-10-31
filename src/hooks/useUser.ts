import {
    skipToken,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useSessionCheck } from "./useSessionCheck";
import { useTRPC } from "../components/trpc/trpc.client";

export function useUser() {
    const { loading, authenticated } = useSessionCheck();
    const queryClient = useQueryClient();
    const { user } = useTRPC();

    const isEnabled = !loading && authenticated;

    const metadataQ = useQuery(
        user.getMetadata.queryOptions(isEnabled ? undefined : skipToken, {
            refetchOnMount: true,
            refetchOnWindowFocus: true,
        })
    );

    const infoQ = useQuery(
        user.getInfo.queryOptions(undefined, {
            refetchOnMount: true,
            refetchOnWindowFocus: true,
        })
    );

    const editMetadata = useMutation(
        user.editMetadata.mutationOptions({
            onSettled: () =>
                queryClient.invalidateQueries({
                    queryKey: user.getMetadata.queryKey(),
                }),
        })
    );

    return {
        infoQ,
        metadataQ,
        editMetadata,
    };
}
