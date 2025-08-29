import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import type { StoryType } from "./StoriesSlider";

interface Props {
  storyData: StoryType;
  setOpenStoryId: (storyId: string | null) => void;
}

const StoryCard = ({ storyData, setOpenStoryId }: Props) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    const adjustFontSize = () => {
      if (textRef.current && cardRef.current) {
        let currentFontSize = 18;
  
        let textHeight = textRef.current.scrollHeight;
        let cardHeight = cardRef.current.clientHeight;
  
        while((textHeight > (cardHeight - 32)) && currentFontSize > 10) {
          currentFontSize -= 1;
          
          textRef.current.style.fontSize = `${currentFontSize}px`;
          textHeight = textRef.current.scrollHeight;
        }
        
        setFontSize(currentFontSize);
      };
    }

    adjustFontSize();

    window.addEventListener("resize", adjustFontSize);

    return () => {
      window.removeEventListener("resize", adjustFontSize);
    }
  }, []);

  return (
    <button
      ref={cardRef}
      style={{
        ...(storyData.media_type === "image" ?
            {
              backgroundImage: `url(${storyData.media_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            } :
            {backgroundColor: storyData.background_color}
          ),
      }}
      className="relative flex justify-center items-center w-auto h-full aspect-[3/4] min-[1100px]:aspect-[1/1.7] p-3 bg-neutral-100 rounded-md overflow-hidden cursor-pointer"
      onClick={() => setOpenStoryId(storyData._id)}
    >
      <Avatar className="absolute top-3 left-3 outline-2 outline-white">
        <AvatarImage
          src={storyData.user.profile_picture}
          alt={storyData.user.username}
        />
        <AvatarFallback>
          {storyData.user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {storyData.content &&
        <p
          ref={textRef}
          style={{
            color: storyData.text_color,
            fontSize: `${fontSize}px`,
            backgroundColor: storyData.text_bg_color
          }}
          className="px-1 py-0.5 text-white text-center text-shadow-sm line-clamp-6 rounded-sm transition-all"
        >
          {storyData.content}
        </p>
      }
    </button>
  )
}

export default StoryCard