import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar el número de seguidos del usuario */
const useGetFollowingCount = () => {
  const {getToken} = useAuth();

  const {data, isLoading} = useQuery({
    queryKey: ["following-count"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: number}>({
        method: "GET",
        url: "/follows/get-following-count",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data;
    }
  });

  return {
    followingCount: data?.data ?? 0,
    loadingFollowingCount: isLoading
  };
};

export default useGetFollowingCount;