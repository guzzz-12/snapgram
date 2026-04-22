import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

/** Hook para obtener información del usuario actual */
const useGetCurrentUser = ({ enabled }: { enabled: boolean }) => {
  const { data: userData, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await axiosInstance<{ data: UserType }>({
        method: "GET",
        url: "/users/me"
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