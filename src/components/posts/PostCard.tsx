import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import Slider, {type Settings} from "react-slick";
import { Twemoji } from "react-emoji-render";
import { toast } from "sonner";
import PostHeader from "./PostCardHeader";
import PostCardFooter from "./PostCardFooter";
import CreatePostInput from "./CreatePostInput";
import { Button } from "../ui/button";
import useClampedText from "@/hooks/useClampedText";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import { cn } from "@/lib/utils";
import type { PostWithLikes } from "@/types/global";

interface Props {
  postData: PostWithLikes;
  isModal?: boolean;
  className?: HTMLAttributes<HTMLElement>["className"];
}

const SLIDER_SETTINGS: Settings = {
  className: "postCardSlider",
  dots: true,
  infinite: false,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
};

const PostCard = ({ postData, isModal, className }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);
  const showClampBtnRef = useRef<"shouldShow" | "shouldNotShow">("shouldNotShow");

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [textContent, setTextContent] = useState(() => postData.content);

  // Restablecer el texto inicial del post al salir
  // del modo de edición sin guardar los cambios
  useEffect(() => {
    return () => setTextContent(postData.content);
  }, [isEditingPost]);

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, showClampBtnRef });

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: `/posts/${postData._id}`,
        data: {
          content: textContent
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});
      setIsEditingPost(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
      setTextContent(postData.content);
    }
  });

  return (
    <article className={cn("flex flex-col gap-3 w-full p-4 rounded-lg bg-white shadow", className)}>
      <PostHeader
        postData={postData}
        setisEditingPost={(bool) => setIsEditingPost(bool)}
      />

      {isEditingPost && (
        <div className="w-full">
          <CreatePostInput
            textContent={textContent}
            isPending={isPending}
            setTextContent={setTextContent}
          />

          <div className="flex justify-end items-center gap-2 w-full py-2">
            <Button
              className="cursor-pointer"
              variant="outline"
              disabled={isPending}
              onClick={() => setIsEditingPost(false)}
            >
              Cancelar
            </Button>

            <Button
              className="bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer disabled:pointer-events-none"
              disabled={
                isPending
                ||
                (textContent === postData.content)
                ||
                (!textContent && postData.postType === "text")
              }
              onClick={() => mutate()}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      )}

      {postData.content && !isEditingPost && (
        <div>
          <p
            ref={textContentRef}
            className={cn("inline-block text-base text-left text-neutral-700 whitespace-pre-wrap bg-transparent", showFullText ? "line-clamp-none" : "line-clamp-6")}
          >
            <Twemoji className="[&>img]:!inline">
              {postData.content}
            </Twemoji>
          </p>
          
          {showClampBtnRef.current === "shouldShow" &&
            <Button
              className="inline-block p-0 text-blue-900 cursor-pointer"
              variant="link"
              onClick={() => {
                setShowFullText(!showFullText);
                setIsClamped(!isClamped);
              }}
            >
              {!isClamped ? "Ver menos..." : "Ver más..."}
            </Button>
          }
        </div>
      )}

      <Slider {...SLIDER_SETTINGS}>
        {postData.imageUrls.map((imageUrl, index) => (
          <div
            key={index}
            style={{
              filter: "blur(15px)",
              backgroundImage: `url(${imageUrl})`
            }}
            className="relative w-full aspect-[4/3] rounded-lg bg-neutral-200 overflow-hidden"
          >
            <div
              style={{
                filter: "blur(15px)",
                backgroundImage: `url(${imageUrl})`
              }}
              className="absolute top-0 left-0 w-full h-full opacity-70 bg-cover bg-center bg-no-repeat z-0"
            />
            
            <img
              className="relative w-full h-full object-contain z-30"
              src={imageUrl}
              alt={`Post de ${postData.user.fullName}`}
            />
          </div>
        ))}
      </Slider>

      <PostCardFooter postData={postData} isModal={isModal} />
    </article>
  )
}

export default PostCard