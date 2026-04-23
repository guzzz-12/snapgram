import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

type Props = {
  userData: UserType;
  selectedImages: File[];
  onSuccess: (data: UserType) => void;
}

const useUpdateAvatar = (props: Props) => {
  const {selectedImages, userData, onSuccess} = props;

  const queryClient = useQueryClient();

  const res = useMutation({
    mutationFn: async () => {
      if (!selectedImages[0]) return;
  
      const formData = new FormData();
  
      formData.append("avatar", selectedImages[0]);
  
      const {data} = await axiosInstance<{data: UserType}>({
        method: "POST",
        url: "/users/user-avatar",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return data.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", userData.clerkId]});
      onSuccess(data!);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    updateAvatarMutation: res.mutate,
    isUpdateAvatarPending: res.isPending
  }
}

export default useUpdateAvatar;