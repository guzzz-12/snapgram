import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { createCryptoKeys } from "@/repositories/cryptoKeysRepository";
import type { UserType } from "@/types/global";

type CreateKeysParams = {
  user: UserType | null;
  pin: string;
  operation: "create" | "update";
}

/** Hook para crear y almacenar la llave de cifrado privada */
const useCreateCryptoKeys = (params: CreateKeysParams) => {
  const {user, pin, operation} = params;

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {mutate, isPending, error} = useMutation({
    mutationFn: async (_props: {onSuccess?: () => void}) => createCryptoKeys({user, pin, operation, getToken}),
    onSuccess: async (_data, {onSuccess}) => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      await queryClient.invalidateQueries({queryKey: ["getCryptoKeys"]});

      onSuccess?.();
    },
    onError: (error) => {
      console.log(error);

      toast.error("Error al habilitar el cifrado de extremo a extremo. Inténtalo de nuevo.");
    },
  });

  return {
    mutate,
    isPending,
    error
  };
}

export default useCreateCryptoKeys;