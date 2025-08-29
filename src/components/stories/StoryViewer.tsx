import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import StoryProgressBar from "./StoryProgressBar";
import { dummyStoriesData } from "@/dummy-data";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  storyId: string | null;
  setOpenStoryId: (storyId: string | null) => void;
}

const StoryViewer = ({ isOpen, storyId, setOpenStoryId }: Props) => {
  const storyData = dummyStoriesData.find(story => story._id === storyId);

  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {    
    return () => {
      setShowFullText(false);
    }
  }, [isOpen]);

  if (!storyData) return null;

  const hasMedia = storyData.media_type === "image";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setOpenStoryId(null);
        }
      }}
    >
      <DialogOverlay className="bg-black opacity-70" />

      <DialogContent
        style={{
          backgroundColor: storyData.background_color,
          backgroundImage: hasMedia ? `url(${storyData.media_url})` : "",
          backgroundSize: hasMedia ? "cover" : "",
          backgroundPosition: hasMedia ? "center" : "",
        }}
        className="w-auto h-[95vh] p-0 aspect-[1/1.7] rounded-lg border-none overflow-hidden [&>button]:hidden"
      >
        <DialogTitle className="sr-only">
          Historia de {storyData.user.full_name}
        </DialogTitle>

        <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
          {/* Header del story */}
          <div className="relative flex justify-start items-center gap-3 bg-linear-to-b from-black to-transparent p-4 pb-6">
            <StoryProgressBar isOpen={isOpen} setOpenStoryId={setOpenStoryId} />

            <Avatar className="size-10">
              <AvatarImage src={storyData.user.profile_picture} />
              <AvatarFallback>
                {storyData.user.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-0.5 w-full overflow-hidden">
              <p className="text-white font-semibold truncate">
                {storyData.user.full_name}
              </p>

              <p className="text-xs text-neutral-300 truncate">
                {dayjs(storyData.updatedAt).format("hh:mm A, MMMM D, YYYY")}
              </p>
            </div>

            <DialogClose asChild>
              <Button
                className="ml-auto hover:bg-transparent cursor-pointer"
                variant="ghost"
                size="icon"
                disabled={false}
              >
                <X className="size-9 shrink-0 text-white stroke-2" aria-hidden />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DialogClose>
          </div>

          {/* Contenido de texto del story (si lo hay) */}
          {storyData.content && (
            <button
              style={{backgroundColor: storyData.text_bg_color}}
              className="w-full max-w-[90%] h-auto mx-auto my-auto p-2 translate-y-[-20px] rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-[transparent]"
              aria-describedby="story-content-description"
              onClick={() => setShowFullText(prev => !prev)}
            >
              <p
                style={{color: storyData.text_color}}
                className={cn("text-2xl text-center leading-tight text-shadow-lg font-semibold whitespace-pre-wrap", showFullText ? "line-clamp-none" : "line-clamp-[12]")}
              >
                {storyData.content}
              </p>

              <span
                id="story-content-description"
                className="sr-only"
              >
                Clickea para ver el texto completo
              </span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default StoryViewer