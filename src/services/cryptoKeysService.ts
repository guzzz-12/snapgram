import { createCryptoKeys, fetchUserCryptoKeys } from "@/repositories/cryptoKeysRepository";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserType } from "@/types/global";

type CreateKeysParams = {
  user: UserType | null;
  pin: string;
  operation: "create" | "update";
}

type GetUserKeysParams = {
  user: UserType | null;
  pin: string;
}

/**
 * Services de las claves de cifrado del usuario.
 * Debe ser invocado en el top level del componente.
 */
export const useCryptoKeysService = () => {
  return {
    /** Service para crear y almacenar la llave de cifrado privada */
    createCryptoKeys: (params: CreateKeysParams) => {
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
    },

    /** Service para obtener las claves de cifrado del usuario */
    getUserCryptoKeys: (params: GetUserKeysParams) => {
      const {user, pin} = params;

      const {getToken} = useAuth();

      const {error, isFetching, status, } = useQuery({
        queryKey: ["getMyCryptoKeys"],
        queryFn: async () => fetchUserCryptoKeys({user, pin, getToken}),
        retry: false,
        enabled: !!user && pin.length === 6,
        refetchOnWindowFocus: false,
      });

      return {status, error, isFetching};
    }
  }
}