import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes } from "@/types/global";

interface Props {
  postData: PostWithLikes;
}

const PostCardFooter = ({ postData }: Props) => {
  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "POST",
        url: `/likes/post/${postData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});
      await queryClient.invalidateQueries({queryKey: ["posts", postData._id]});
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return (
    <div className="flex justify-start items-center gap-3 w-full">
      <button
        className="flex items-center gap-1 text-neutral-500 cursor-pointer"
        disabled={likeMutation.isPending}
        onClick={() => likeMutation.mutate()}
      >
        <Heart
          className="size-4"
          fill={postData.isLiked ? "red" : "none"}
          stroke={postData.isLiked ? "red" : "currentColor"}
          aria-hidden
        />

        <span className="text-sm font-semibold" aria-hidden>
          {postData.likesCount}
        </span>

        <span className="sr-only">
          Este post tiene {postData.likesCount} me gusta
        </span>
      </button>

      <button className="flex items-center gap-1 text-neutral-500 cursor-pointer">
        <MessageCircle className="size-4" aria-hidden />
        
        <span className="text-sm font-semibold" aria-hidden>
          {21}
        </span>

        <span className="sr-only">
          Este post tiene {21} Comentarios
        </span>
      </button>

      <button className="flex items-center gap-1 text-neutral-500 cursor-pointer">
        <Share2 className="size-4" aria-hidden />
        <span className="text-sm font-semibold" aria-hidden>
          {6}
        </span>
        <span className="sr-only">
          Este post ha sido compartido {6} veces
        </span>
      </button>
    </div>
  )
}

export default PostCardFooter