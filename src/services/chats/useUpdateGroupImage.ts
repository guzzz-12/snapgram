import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  groupId: string;
  selectedImageFiles: File[];
  onSuccess: () => void;
}

const useUpdateGroupImage = (props: Props) => {
  const {groupId, selectedImageFiles, onSuccess} = props;

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      formData.append("groupImage", selectedImageFiles[0]!);
  
      return axiosInstance<{data: ChatType}>({
        method: "PUT",
        url: `/chats/group/${groupId}/update-image`,
        data: formData
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["groupInfo", groupId]});
      onSuccess();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useUpdateGroupImage;