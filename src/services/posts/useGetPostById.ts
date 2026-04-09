import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { getPost } from "@/repositories/postsRepository";

type GetPostProps = {
  postId: string | undefined;
}

/** Hook para consultar un post mediante su ID */
const useGetPostById = ({postId}: GetPostProps) => {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["posts", postId],
    queryFn: async () => getPost({postId, getToken}),
    enabled: !!postId,
    refetchOnWindowFocus: false,
    retry: 1
  });
}

export default useGetPostById