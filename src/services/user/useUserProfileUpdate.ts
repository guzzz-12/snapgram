import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { FormType } from "@/components/profile/ProfileEditModal";

type Props = {
  userId: string | null | undefined;
  onSuccess: () => void;
}

const useUserProfileUpdate = ({userId, onSuccess}: Props) => {
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (values: FormType) => {
      const {data} = await axiosInstance({
        method: "PUT",
        url: `/users/update-user`,
        data: values,
        headers: {
          "Content-Type": "application/json"
        }
      });

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ["user", userId]}),
        queryClient.invalidateQueries({queryKey: ["posts", userId]}),      
      ]);

      onSuccess();
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return updateUserMutation;
}

export default useUserProfileUpdate;