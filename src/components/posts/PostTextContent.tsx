import { useRef } from "react";
import { Twemoji } from "react-emoji-render";
import { Button } from "@/components/ui/button";
import useClampedText from "@/hooks/useClampedText";
import { hashtagParser } from "@/utils/hashtagsParser";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
}

const PostTextContent = ({ postData }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);
  const showClampBtnRef = useRef<"shouldShow" | "shouldNotShow">("shouldNotShow");

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, showClampBtnRef });

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
  )
}

export default PostTextContent