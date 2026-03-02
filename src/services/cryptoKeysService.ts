import { type RefObject } from "react";
import { createCryptoKeys, fetchUserCryptoKeys } from "@/repositories/cryptoKeysRepository";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import type { UserType } from "@/types/global";

type CreateKeysParams = {
  user: UserType | null;
  pin: string;
  operation: "create" | "update";
  setPin: (pin: string) => void;
  setCreatePinStep: (step: number) => void;
  setOpenConfirmationModal: (open: boolean) => void;
  pinRef: RefObject<string | null>;
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
      const {user, pin, operation, setPin, setCreatePinStep, setOpenConfirmationModal, pinRef} = params;

      const navigate = useNavigate();

      const {getToken} = useAuth();

      const queryClient = useQueryClient();

      const {setUser} = useCurrentUser();

      const {setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

      const {mutate, isPending} = useMutation({
        mutationFn: async () => createCryptoKeys({user, pin, operation, getToken}),
        onSuccess: async () => {
          if (!user) {
            return;
          }

          await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
          await queryClient.invalidateQueries({queryKey: ["getCryptoKeys"]});

          toast.success("Cifrado habilitado exitosamente.");

          setPin("");

          pinRef.current = null;

          setCreatePinStep(1);
          
          if (operation === "update") {
            setOpenConfirmationModal(false);
            navigate("/messages?type=all", {replace: true});        
          }

          setUser({...user, hasCryptoKeys: true});

          setHasLocalCryptoKeys(true);
        },
        onError: (error) => {
          console.log(error);

          toast.error("Error al habilitar el cifrado de extremo a extremo. Inténtalo de nuevo.");

          setPin("");
          setCreatePinStep(1);

          pinRef.current = null;
        },
      });

      return {mutate, isPending};
    },

    /** Service para obtener las claves de cifrado del usuario */
    getUserCryptoKeys: (params: GetUserKeysParams) => {
      const {user, pin} = params;

      const {getToken} = useAuth();

      const {setUser} = useCurrentUser();

      const {setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

      const {error, isFetching, status} = useQuery({
        queryKey: ["getMyCryptoKeys"],
        queryFn: async () => fetchUserCryptoKeys({user, pin, getToken}),
        retry: false,
        enabled: !!user && pin.length === 6,
        refetchOnWindowFocus: false,
      });

      if (status === "success" && user) {
        setUser({...user, hasCryptoKeys: true});
        setHasLocalCryptoKeys(true);
      }

      return {error, isFetching};
    }
  }
}