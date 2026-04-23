import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para deshabilitar la cuenta de usuario */
const useDisableAccount = () => {
  const {signOut} = useAuth();
  
  const {mutate: disableAccount, isPending} = useMutation({
    mutationFn: async () => {
      const {data} = await axiosInstance({
        method: "PUT",
        url: "/users/disable-account"
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Tu cuenta ha sido deshabilitada correctamente");

      setTimeout(() => {
        signOut({redirectUrl: "/"});
      }, 1000);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {disableAccount, isPending};
}

export default useDisableAccount;
