import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { updateGroupInfoFn } from "@/repositories/chatsRepository";
import { errorMessage } from "@/utils/errorMessage";

type UpdateGroupParams = {
  groupId: string | undefined;
  groupName: string;
  groupDescription: string;
}

/** Hook para actualizar la informacion de un grupo */
const useUpdateGroupInfo = (params: UpdateGroupParams) => {
  const {groupId, groupName, groupDescription} = params;

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate: updateGroupInfoMutation, isPending: isUpdating} = useMutation({
    mutationFn: (_props: {onSuccess?: () => void}) => updateGroupInfoFn({groupId, groupName, groupDescription, getToken}),
    onSuccess: async (_data, {onSuccess}) => {
      await queryClient.invalidateQueries({queryKey: ["groupInfo", groupId]});

      onSuccess?.();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {updateGroupInfoMutation, isUpdating};
}

export default useUpdateGroupInfo;