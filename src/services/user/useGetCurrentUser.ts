import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

/** Hook para obtener información del usuario actual */
const useGetCurrentUser = ({ enabled }: { enabled: boolean }) => {
  const { getToken } = useAuth();

  const { data: userData, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const token = await getToken();

      const { data } = await axiosInstance<{ data: UserType }>({
        method: "GET",
        url: "/users/me",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled,
    retry: 2,
    refetchOnWindowFocus: false
  });

  return { userData, loadingUser, userError };
}

export default useGetCurrentUser;