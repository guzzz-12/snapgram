import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { useSearchParams } from "react-router";
import { Twemoji } from "react-emoji-render";
import PostHeader from "./PostCardHeader";
import PostCardSlider from "./PostCardSlider";
import PostCardFooter from "./PostCardFooter";
import CreatePostInput from "./CreatePostInput";
import SharedPostCard from "./SharedPostCard";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import { Button } from "../ui/button";
import type { EditPostProps } from "@/services/postsService";
import useClampedText from "@/hooks/useClampedText";
import { hashtagParser } from "@/utils/hashtagsParser";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
  isModal?: boolean;
  className?: HTMLAttributes<HTMLElement>["className"];
  editPost: () => {
    mutate: (params: EditPostProps) => void;
    isPending: boolean;
  }
}

const PostCard = ({ postData, isModal, className, editPost }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [textContent, setTextContent] = useState(() => postData.content);
  const [openPostModal, setOpenPostModal] = useState(false);

  // Restablecer el texto inicial del post al salir
  // del modo de edición sin guardar los cambios
  useEffect(() => {
    return () => setTextContent(postData.content);
  }, [isEditingPost]);

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, clampedTextData: postData.content });

  const {mutate, isPending} = editPost();

  const onSaveChangesHandler = () => {
    mutate({
      postData,
      updatedTextContent: textContent,
      searchTerm,
      onSuccess: () => {
        setIsEditingPost(false);
      }
    });
  }

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
              onClick={onSaveChangesHandler}
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
              {hashtagParser(postData.content)}
            </Twemoji>
          </p>
          
          {isClamped &&
            <SeeMoreBtn
              isClamped={isClamped}
              setIsClamped={setIsClamped}
              setShowFullText={setShowFullText}
            />
          }
        </div>
      )}

      {/* Contenido del post */}
      {postData.postType !== "repost" &&
        <PostCardSlider data={postData} />
      }

      {/* Contenido del repost */}
      {postData.postType === "repost" &&
        <SharedPostCard data={postData.originalPost} />
      }

      <PostCardFooter
        postData={postData}
        isModal={isModal}
        openPostModal={openPostModal}
        setOpenPostModal={(open) => setOpenPostModal(open)}
      />
    </article>
  )
}

export default PostCard