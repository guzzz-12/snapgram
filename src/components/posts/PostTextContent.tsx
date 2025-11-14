import { useRef } from "react";
import { Twemoji } from "react-emoji-render";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import useClampedText from "@/hooks/useClampedText";
import { hashtagParser } from "@/utils/hashtagsParser";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
}

const PostTextContent = ({ postData }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, clampedTextData: postData.content });

  return (
    <div className="mb-3 px-3">
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
  )
}

export default PostTextContent