import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Slider from "react-slick";
import { MdOutlineClose } from "react-icons/md";
import { toast } from "sonner";
import PostCardHeader from "@/components/posts/PostCardHeader";
import EditPostForm from "@/components/posts/EditPostForm";
import PostCardFooter from "@/components/posts/PostCardFooter";
import PostTextContent from "@/components/posts/PostTextContent";
import PostCommentInput from "@/components/posts/PostCommentInput";
import CommentsList from "@/components/comments/CommentsList";
import SharedPostCard from "@/components/posts/SharedPostCard";
import PostNotFound from "@/components/posts/PostNotFound";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { SLIDER_SETTINGS } from "@/utils/constants";
import type { Comment, PostWithLikes } from "@/types/global";

const PostPage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const { postId } = useParams();
  const navigate = useNavigate();

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [textContent, setTextContent] = useState("");

  const {getToken} = useAuth();

  // Query function para consultar los comentarios
  const getComments = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: Comment[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: `/comments/posts/${postId}`,
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

  // Consultar el post
  const {data: postData, error: postError, isLoading} = useQuery({
    queryKey: ["posts", postId],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: PostWithLikes}>({
        method: "GET",
        url: `/posts/${postId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled: !!postId,
    refetchOnWindowFocus: false,
    retry: 1
  });

  if (postError) {
    toast.error(errorMessage(postError));
  }

  // Inicializar el contenido de texto del formulario
  // de edición del post al entrar en modo de edición.
  useEffect(() => {
    if (isEditingPost && postData) {
      setTextContent(postData.content);
    }
  }, [postData, isEditingPost]);

  // Consultar los comentarios del post
  const {data: commentsData, error: commentsError, isLoading: isLoadingComments, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["postComments", postId],
    queryFn: async ({ pageParam }) => getComments(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: !!postData
  });

  const {isIntersecting} = useIntersectionObserver({paginationRef, data: commentsData});

  // Consultar la siguiente página de comentarios al scrollear al final de la lista
  useEffect(() => {
    if (isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage]);

  if (commentsError) {
    toast.error(errorMessage(commentsError));
  }

  const comments = commentsData?.pages.flatMap(page => page.data) || [];
  const loadingComments = isLoadingComments || isFetchingNextPage;

  if (!postId) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="flex gap-2 w-full h-screen p-3 bg-white">
        <Skeleton className="w-[70%] h-full bg-neutral-300" />

        <Skeleton className="flex flex-col gap-2 w-[30%] h-full bg-neutral-300">
          <div className="flex justify-start items-center gap-3 p-3">
            <Skeleton className="w-[60px] h-[60px] shrink-0 rounded-full bg-neutral-100" />
            <div className="flex flex-col justify-center items-start gap-2 w-full">
              <Skeleton className="w-[80%] h-6 rounded bg-neutral-100" />
              <Skeleton className="w-1/3 h-4 rounded bg-neutral-100" />
            </div>
          </div>

          <div className="flex justify-between items-center gap-4 w-full px-3">
            <Skeleton className="w-full h-6 rounded-md bg-neutral-100" />
            <Skeleton className="w-full h-6 rounded-md bg-neutral-100" />
            <Skeleton className="w-full h-6 rounded-md bg-neutral-100" />
          </div>
        </Skeleton>
      </div>
    )
  }

  if (!postData) {
    return <PostNotFound />
  }

  return (
    <main className="h-auto min-[950px]:h-screen p-0 min-[950px]:overflow-y-hidden">
      {/* Botón para salir del post */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="fixed top-4 left-4 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 cursor-pointer z-10"
            onClick={() => navigate(-1)}
          >
            <MdOutlineClose className="size-8 text-white/80" aria-hidden />
            <span className="sr-only">
              Salir de la publicación
            </span>
          </button>
        </TooltipTrigger>

        <TooltipContent side="right">
          Volver
        </TooltipContent>
      </Tooltip>

      {/* Contenido del post de tipo texto */}
      {postData.postType === "text" &&
        <section className="flex flex-col w-full max-w-[700px] h-full mx-auto py-4">
          <div className="w-full h-full bg-white rounded-t-md overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <PostCardHeader
              className="mb-3 px-4 pt-3"
              postData={postData}
              setisEditingPost={setIsEditingPost}
            />

            <Separator className="my-3" />

            {/* Formulario para editar el post */}
            {isEditingPost && (
              <EditPostForm
                postData={postData}
                textContent={textContent}
                setTextContent={setTextContent}
                setIsEditingPost={setIsEditingPost}
              />
            )}

            {postData.content && !isEditingPost && (
              <PostTextContent postData={postData} />
            )}

            <PostCardFooter className="mb-2 px-3" postData={postData} />

            <CommentsList
              className="px-3 py-2"
              comments={comments}
              isLoading={loadingComments}
            />
          </div>

          <PostCommentInput className="shadow rounded-b-md" postId={postData._id} />
        </section>
      }

      {/* Contenido del post de tipo repost (post compartido) */}
      {postData.postType === "repost" &&
        <section className="flex flex-col w-full max-w-[700px] h-full mx-auto py-4">
          <div className="w-full h-full bg-white rounded-t-md overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <PostCardHeader
              className="mb-3 px-4 pt-3"
              postData={postData}
              setisEditingPost={setIsEditingPost}
            />

            <Separator className="my-3" />

            {/* Formulario para editar el post */}
            {isEditingPost && (
              <EditPostForm
                postData={postData}
                textContent={textContent}
                setTextContent={setTextContent}
                setIsEditingPost={setIsEditingPost}
              />
            )}

            {postData.content && !isEditingPost && (
              <PostTextContent postData={postData} />
            )}

            <div className="mb-3 px-3">
              <SharedPostCard data={postData.originalPost!} />
            </div>

            <PostCardFooter className="mb-2 px-3" postData={postData} />

            <CommentsList
              className="px-3 py-2"
              comments={comments}
              isLoading={loadingComments}
            />
          </div>
        </section>
      }

      {/* Contenido del post de tipo imagen o texto + imagen */}
      {(postData.postType == "image" || postData.postType === "textWithImage") &&
        <section className="flex flex-col min-[950px]:flex-row w-full h-full bg-black overflow-hidden">
          {/* Columna izquierda: Slider de imágenes del post */}
          <div className="w-full h-full overflow-hidden">
            <Slider
              className="postPageSlider"
              {...SLIDER_SETTINGS}
              dots={false}
            >
              {postData.imageUrls.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative w-full h-[80vh] min-[950px]:h-screen bg-black overflow-hidden"
                >
                  <div
                    style={{
                      filter: "blur(15px) opacity(0.3)",
                      backgroundImage: `url(${imageUrl})`
                    }}
                    className="absolute top-0 left-0 w-full h-full opacity-70 bg-cover bg-center bg-no-repeat z-0"
                  />
                  
                  <img
                    className="relative w-full h-full object-contain object-center z-30"
                    src={imageUrl}
                    alt={`Post de ${postData.user.fullName}`}
                  />
                </div>
              ))}
            </Slider>
          </div>

          {/* Columna derecha (autor, información del post, comentarios) */}
          <div className="flex flex-col gap-3 w-full min-[950px]:w-min h-full shrink-0 pb-0 overflow-hidden bg-neutral-50">
            <div className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <PostCardHeader
                className="p-3 pb-0"
                postData={postData}
                setisEditingPost={setIsEditingPost}
              />

              <Separator className="my-3 bg-transparent" />

              {isEditingPost && (
                <EditPostForm
                  postData={postData}
                  textContent={textContent}
                  setTextContent={setTextContent}
                  setIsEditingPost={setIsEditingPost}
                />
              )}

              {postData.content && !isEditingPost && (
                <PostTextContent postData={postData} />
              )}

              <PostCardFooter className="mb-2 px-3" postData={postData} />

              <CommentsList
                className="px-3"
                comments={comments}
                isLoading={loadingComments}
              />

              {hasNextPage &&
                <div ref={paginationRef} className="w-full h-4" />
              }
            </div>

            <PostCommentInput postId={postData._id} />
          </div>
        </section>
      }
    </main>
  )
}

export default PostPage