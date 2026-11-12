import { memo, useEffect, useRef, useState, type HTMLAttributes } from "react";
import { useSearchParams } from "react-router";
import { Twemoji } from "react-emoji-render";
import PostHeader from "./PostCardHeader";
import PostCardSlider from "./PostCardSlider";
import PostCardFooter from "./PostCardFooter";
import CreatePostInput from "./CreatePostInput";
import SharedPostCard from "./SharedPostCard";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import { Button } from "../ui/button";
import type { EditPostProps } from "@/services/posts/useEditPost";
import useClampedText from "@/hooks/useClampedText";
import { hashtagParser } from "@/utils/hashtagsParser";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
  isModal?: boolean;
  className?: HTMLAttributes<HTMLElement>["className"];
  editPost: (params: EditPostProps) => void;
  isPending: boolean;
}

const PostCard = ({ postData, isModal, className, editPost, isPending }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [textContent, setTextContent] = useState(() => postData.content);
  const [openPostModal, setOpenPostModal] = useState(false);

  // Sincronizar el texto cuando cambia el contenido del post en el servidor y no se está editando
  useEffect(() => {
    if (!isEditingPost) {
      setTextContent(postData.content);
    }
  }, [postData.content, isEditingPost]);

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, clampedTextData: postData.content });

  const onCancelEditHandler = () => {
    setTextContent(postData.content);
    setIsEditingPost(false);
  };

  const onSaveChangesHandler = () => {
    editPost({
      postData,
      updatedTextContent: textContent,
      searchTerm,
      onSuccess: () => {
        setIsEditingPost(false);
      }
    });
  };

  return (
    <article
      className={cn("flex flex-col gap-3 w-full p-4 rounded-lg bg-white dark:bg-transparent shadow", className)}
      data-testid="post-card"
    >
      <PostHeader
        postData={postData}
        setisEditingPost={setIsEditingPost}
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
              onClick={onCancelEditHandler}
            >
              Cancelar
            </Button>

            <Button
              className="bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer disabled:pointer-events-none"
              disabled={
                isPending ||
                textContent === postData.content ||
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
            className={cn(
              "inline-block text-base text-left text-neutral-700 dark:text-slate-200 whitespace-pre-wrap bg-transparent",
              showFullText ? "line-clamp-none" : "line-clamp-6"
            )}
          >
            <Twemoji className="[&>img]:!inline">
              {hashtagParser(postData.content)}
            </Twemoji>
          </p>

          {isClamped && (
            <SeeMoreBtn
              isClamped={isClamped}
              setIsClamped={setIsClamped}
              setShowFullText={setShowFullText}
            />
          )}
        </div>
      )}

      {/* Contenido del post */}
      {postData.postType !== "repost" && <PostCardSlider data={postData} />}

      {/* Contenido del repost */}
      {postData.postType === "repost" && <SharedPostCard data={postData.originalPost} />}

      <PostCardFooter
        postData={postData}
        isModal={isModal}
        openPostModal={openPostModal}
        setOpenPostModal={setOpenPostModal}
      />
    </article>
  );
};

export default memo(PostCard);