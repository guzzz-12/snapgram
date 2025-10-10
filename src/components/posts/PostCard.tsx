import { useRef } from "react";
import Slider, {type Settings} from "react-slick";
import PostHeader from "./PostCardHeader";
import PostCardFooter from "./PostCardFooter";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import useClampedText from "@/hooks/useClampedText";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
}

const SLIDER_SETTINGS: Settings = {
  className: "postCardSlider",
  dots: true,
  infinite: false,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
};

const PostCard = ({ postData }: Props) => {
  const textContentRef = useRef<HTMLParagraphElement>(null);
  const showClampBtnRef = useRef<"shouldShow" | "shouldNotShow">("shouldNotShow");

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, showClampBtnRef });

  return (
    <article className="flex flex-col gap-2 w-full p-4 rounded-lg bg-white shadow">
      <PostHeader postData={postData} />

      {postData.content && (
        <div>
          <p
            ref={textContentRef}
            className={cn("inline-block text-base text-left text-neutral-700 whitespace-pre-wrap bg-transparent", showFullText ? "line-clamp-none" : "line-clamp-6")}
          >
            {postData.content}
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

      <Separator className="w-full" />

      <PostCardFooter postData={postData} />
    </article>
  )
}

export default PostCard