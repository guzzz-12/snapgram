import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { fetchUserCryptoKeys } from "@/repositories/cryptoKeysRepository";
import type { UserType } from "@/types/global";

type GetUserKeysParams = {
  user: UserType | null;
  pin: string;
}

/** Hook para obtener las claves de cifrado del usuario */
const useGetUserCryptoKeys = (params: GetUserKeysParams) => {
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

export default useGetUserCryptoKeys;