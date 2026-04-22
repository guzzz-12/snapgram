import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/utils/axiosInstance";

/** Hook para consultar el número de seguidos del usuario */
const useGetFollowingCount = () => {
  const {data, isLoading} = useQuery({
    queryKey: ["following-count"],
    queryFn: async () => {
      const {data} = await axiosInstance<{data: number}>({
        method: "GET",
        url: "/follows/get-following-count"
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