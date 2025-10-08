import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import { CircleChevronLeft, CircleChevronRight, EllipsisVertical, Pause, Play, Trash2, X } from "lucide-react";
import StoryProgressBar from "./StoryProgressBar";
import DeleteStoryModal from "./DeleteStoryModal";
import { Dialog, DialogClose, DialogContent, DialogOverlay } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import type { UserWithStories } from "@/types/global";

interface Props {
  isOpen: boolean;
  usersWithStories: UserWithStories[];
  // Se usa como criterio abrir/cerrar el visor
  storiesUserId: string | null;
  setStoriesUserId: (userId: string | null) => void;
}

const UserStoriesViewer = ({ isOpen, usersWithStories, storiesUserId, setStoriesUserId }: Props) => {
  const storiesUser = usersWithStories.find((user) => user._id === storiesUserId);
  const stories = storiesUser?.stories || [];

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState("");
  const [seenStories, setSeenStories] = useState<string[]>([]);

  const {userId} = useAuth();

  const currentStory = stories.find((story) => story._id === activeStoryId);
  const hasMedia = currentStory?.mediaType === "image";
  
  // Abrir el primer story cuando se abre el visor de stories
  useEffect(() => {
    if (stories.length > 0 && isOpen) {
      setActiveStoryId(stories[0]._id);
      setSeenStories([stories[0]._id]);
    }

    if (stories.length === 0 && isOpen) {
      setStoriesUserId(null);
    }
  }, [stories, isOpen]);

  // Pausar/reanudar el story cuando se abre/cierra el modal de eliminar la historia
  useEffect(() => {
    if (openDeleteModal) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [openDeleteModal]);

  const nextStoryHandler = () => {
    if (stories.length === 0 || activeStoryId === stories[stories.length - 1]._id) {
      return false;
    };
    
    const currentIndex = stories.findIndex((story) => story._id === activeStoryId);

    setActiveStoryId(stories[currentIndex + 1]._id);

    const filteredDuplicates = seenStories.filter((id) => id !== stories[currentIndex + 1]._id);
    setSeenStories([...filteredDuplicates, stories[currentIndex + 1]._id]);
  }

  const prevStoryHandler = () => {
    if (stories.length === 0 || activeStoryId === stories[0]._id) {
      return false;
    };
    
    const currentIndex = stories.findIndex((story) => story._id === activeStoryId);
    
    setActiveStoryId(stories[currentIndex - 1]._id);

    // Remover todos los stories posteriores del array de stories vistos
    const sliced = seenStories.slice(0, currentIndex);
    setSeenStories(sliced);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSeenStories([]);
          setStoriesUserId(null);
        }
      }}
    >
      <DialogOverlay className="bg-black opacity-70" />

      <DialogContent
        style={{
          backgroundColor: currentStory?.backgroundColor,
          backgroundImage: hasMedia ? `url(${currentStory?.mediaUrl})` : "",
          backgroundSize: currentStory?.imageSize,
          backgroundPosition: hasMedia ? "center" : "",
          backgroundRepeat: hasMedia ? "no-repeat" : "",
        }}
        className="w-auto h-[95vh] p-0 aspect-[1/1.7] border-none [&>button]:hidden"
      >
        <div className="relative flex flex-col gap-4 w-full h-full">
          {stories.length > 1 && (
            <>
              <div className="absolute top-0 left-0 flex justify-center items-center h-full px-1 translate-x-[-90%] z-10">
                <button
                  className="p-2 opacity-50 hover:opacity-100 cursor-pointer disabled:cursor-not-allowed transition-all"
                  disabled={activeStoryId === stories[0]._id}
                  onClick={prevStoryHandler}
                >
                  <CircleChevronLeft className="size-6 stroke-white" />
                </button>
              </div>

              <div className="absolute top-0 right-0 flex justify-center items-center h-full px-1 translate-x-[90%] z-10">
                <button
                  className="p-2 opacity-50 hover:opacity-100 cursor-pointer disabled:cursor-not-allowed transition-all"
                  disabled={activeStoryId === stories[stories.length - 1]._id}
                  onClick={nextStoryHandler}
                >
                  <CircleChevronRight className="size-6 stroke-white" />
                </button>
              </div>
            </>
          )}


          {/* Header del viewer */}
          <div className="relative bg-linear-to-b from-black to-transparent p-4 pb-6">
            <div className="absolute top-4 left-0 flex items-center gap-1 w-full px-3 z-10">
              {stories.map((story) => (
                <StoryProgressBar
                  key={story._id}
                  isOpen={isOpen}
                  isPaused={isPaused}
                  stories={stories}
                  storyId={story._id}
                  activeStoryId={activeStoryId}
                  seenStories={seenStories}
                  setActiveStoryId={(id) => setActiveStoryId(id)}
                  setIsPaused={(bool) => setIsPaused(bool)}
                  setOpenUserId={setStoriesUserId}
                  setSeenStories={setSeenStories}
                />
              ))}
            </div>

            <div className="flex justify-start items-center gap-3 pt-4">
              <Avatar className="size-8">
                <AvatarImage src={storiesUser?.profilePicture} />
                <AvatarFallback>
                  {storiesUser?.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                <p className="text-sm text-white font-semibold truncate">
                  {storiesUser?.fullName}
                </p>
                <p
                  className="text-xs text-neutral-300 truncate"
                  title={dayjs(currentStory?.updatedAt).format("MMMM D, YYYY - hh:mm A")}
                >
                  {dayjs(currentStory?.updatedAt).format("MM-D-YYYY")}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-white cursor-pointer"
                  onClick={() => setIsPaused(paused => !paused)}
                >
                  {isPaused ?
                    <Play className="size-4.5 fill-white" /> :
                    <Pause className="size-4.5 fill-white" />
                  }
                </button>

                {userId === storiesUser?.clerkId &&
                  <>
                    <DeleteStoryModal
                      storyId={activeStoryId}
                      isOpen={openDeleteModal}
                      setOpenUserId={() => {}}
                      setIsOpen={(open) => setOpenDeleteModal(open)}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 cursor-pointer">
                          <EllipsisVertical
                            className="size-4.5 shrink-0 text-white"
                            aria-hidden
                          />
                          <span className="sr-only">
                            Opciones de la historia
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          className="flex justify-start items-center gap-2 cursor-pointer"
                          onClick={() => setOpenDeleteModal(true)}
                        >
                          <Trash2 className="size-4.5 text-destructive" aria-hidden />
                          <span className="text-sm">Eliminar historia</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
                <DialogClose asChild>
                  <Button
                    className="ml-auto hover:bg-transparent cursor-pointer"
                    variant="ghost"
                    size="icon"
                    disabled={false}
                  >
                    <X className="size-5 shrink-0 text-white stroke-3" aria-hidden />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
          </div>

          {/* Contenido de texto del story (si lo hay) */}
          {currentStory?.content && (
            <div
              style={{backgroundColor: currentStory?.textBgColor}}
              className="w-full max-w-[90%] h-auto mx-auto my-auto p-2 translate-y-[-20px] rounded-md"
            >
              <p
                style={{color: currentStory?.textColor}}
                className="text-2xl text-center leading-tight text-shadow-lg font-semibold whitespace-pre-wrap"
              >
                {currentStory?.content}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserStoriesViewer