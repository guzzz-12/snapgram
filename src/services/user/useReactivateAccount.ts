import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para reactivar la cuenta del usuario */
const useReactivateAccount = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      return axiosInstance({
        method: "PUT",
        url: "/users/reactivate-account"
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["me"]});
      toast.success("Tu cuenta ha sido reactivada correctamente.");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {mutate, isPending};
}

export default useReactivateAccount;
