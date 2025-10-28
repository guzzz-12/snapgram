import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { CirclePlus, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import PostCard from "./PostCard";
import PostCommentInput from "./PostCommentInput";
import CommentsList from "../comments/CommentsList";
import { Dialog, DialogContent, DialogHeader, DialogOverlay } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { Comment, PostWithLikes } from "@/types/global";

interface Props {
  isOpen: boolean;
  postData: PostWithLikes;
  setIsOpen: (isOpen: boolean) => void;
}

const PostModal = ({isOpen, postData, setIsOpen}: Props) => {
  const {getToken} = useAuth();

  const getComments = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: Comment[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/comments/posts/${postData._id}`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5
      }
    });

    return data;
  }

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["postComments", postData._id],
    queryFn: async ({ pageParam }) => getComments(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

  if (error) {
    toast.error(errorMessage(error));
  }

  const comments = data?.pages.flatMap(page => page.data) || [];
  const loading = isLoading || isFetchingNextPage;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent className="flex flex-col gap-0 !w-full !max-w-[700px] h-[90vh] p-0 !shadow-none overflow-hidden">
        <DialogHeader className="flex justify-center p-4 bg-neutral-100 border-b overflow-hidden">
          <h2 className="max-w-[75%] mx-auto text-xl text-center font-semibold truncate">
            Publicación de {postData.user.fullName}
          </h2>
        </DialogHeader>

        <div className="h-full px-5 py-3 overflow-y-auto">
          <PostCard
            className="w-full p-0 shadow-none"
            postData={postData}
            isModal={true}
          />

          <CommentsList comments={comments} isLoading={loading} />

          {hasNextPage && !isFetchingNextPage && (
            <div className="flex justify-center items-center w-full pb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-sm text-neutral-900 cursor-pointer hover:underline"
                    disabled={loading}
                    onClick={() => fetchNextPage()}
                  >
                    <CirclePlus className="size-7" />
                    <span className="sr-only">
                      {isFetchingNextPage ? "Cargando..." : "Ver más"}
                    </span>
                  </button>
                </TooltipTrigger>

                <TooltipContent>
                  Ver más comentarios
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {isFetchingNextPage &&
            <div className="flex justify-center items-center w-full pb-4 text-neutral-600">
              <Loader2Icon className="size-7 animate-spin" />
            </div>
          }
        </div>

        <PostCommentInput postId={postData._id} />
      </DialogContent>
    </Dialog>
  )
}

export default PostModal