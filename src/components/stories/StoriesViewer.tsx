import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import { CircleChevronLeft, CircleChevronRight, EllipsisVertical, Pause, Play, Trash2 } from "lucide-react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "sonner";
import StoryProgressBar from "./StoryProgressBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SeenByUsers from "./SeenByUsers";
import DeleteStoryModal from "./DeleteStoryModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useStoriesService } from "@/services/storiesService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  storiesUsername: string | null;
}

const StoriesViewer = (props: Props) => {
  const { storiesUsername } = props;

  const [activeStoryId, setActiveStoryId] = useState("");
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const { userId } = useAuth();

  const { user: currentUser } = useCurrentUser();

  const { getUserStories, markAsSeen, toggleLikeStory } = useStoriesService();

  // Consultar los stories del usuario al abrir la página de stories
  const { data: storiesData, isLoading, isSuccess, error } = getUserStories(storiesUsername);

  // Dar/quitar like a un story
  const {
    toggleLikeStory: toggleStoryLike,
    isTogglingLikeStory
  } = toggleLikeStory(activeStoryId, storiesUsername, currentUser?._id);

  const { markStoryAsSeen } = markAsSeen(activeStoryId);

  const stories = storiesData?.stories || [];
  const currentStory = stories.find((story) => story._id === activeStoryId);
  const hasMedia = currentStory?.mediaType === "image";

  // Marcar la historia como vista si no es el creador de la misma
  useEffect(() => {
    const story = stories.find((story) => story._id === activeStoryId);

    if (!story || !currentUser) {
      return;
    }

    const isStoryOwner = story.user === currentUser._id;

    if (!isStoryOwner) {
      markStoryAsSeen();
    }
  }, [activeStoryId, currentUser]);

  // Abrir el primer story cuando se abre el visor de stories
  useEffect(() => {
    // No usar stories como dependencia del useEffect para evitar
    // que se restablezca el visor de stories al dar like a un story
    // ya que dar like a un story restablece la caché de los stories.
    if (!isLoading && isSuccess && stories.length > 0) {
      setActiveStoryId(stories[0]._id);
      setSeenStories([stories[0]._id]);
    }
  }, [isLoading, isSuccess]);

  if (error) {
    toast.error(errorMessage(error));
  }

  // Ir al siguiente story
  const nextStoryHandler = () => {
    // No hacer nada si no hay stories o si el story actual es el último
    if (stories.length === 0 || activeStoryId === stories[stories.length - 1]._id) {
      return false;
    };

    const currentIndex = stories.findIndex((story) => story._id === activeStoryId);

    setActiveStoryId(stories[currentIndex + 1]._id);

    const filteredDuplicates = seenStories.filter((id) => id !== stories[currentIndex + 1]._id);
    setSeenStories([...filteredDuplicates, stories[currentIndex + 1]._id]);
  }

  // Ir al story anterior
  const prevStoryHandler = () => {
    // No hacer nada si no hay stories o si el story actual es el primero
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
    <div
      style={{
        backgroundColor: currentStory?.backgroundColor || "#000000",
        backgroundImage: hasMedia ? `url(${currentStory?.mediaUrl})` : "",
        backgroundSize: currentStory?.imageSize,
        backgroundPosition: hasMedia ? "center" : "",
        backgroundRepeat: hasMedia ? "no-repeat" : "",
      }}
      className="w-full h-full rounded-md"
    >
      {isLoading &&
        <Skeleton className="w-full h-full bg-neutral-500" />
      }

      {!isLoading && currentStory &&
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

          <div className="relative flex flex-col justify-start items-center p-4 pb-6 h-full">
            <div className="absolute top-0 left-0 w-full h-[20%] bg-linear-to-b from-black to-transparent rounded-t-lg z-[1]" />

            <div className="absolute bottom-0 left-0 w-full h-[20%] bg-linear-to-t from-black to-transparent rounded-b-lg z-[1]" />

            <div className="absolute top-4 left-0 flex items-center gap-1 w-full px-3 z-10">
              {stories.map((story) => (
                <StoryProgressBar
                  key={story._id}
                  isPaused={isPaused}
                  stories={stories}
                  storyId={story._id}
                  activeStoryId={activeStoryId}
                  seenStories={seenStories}
                  setActiveStoryId={(id) => setActiveStoryId(id)}
                  setIsPaused={(bool) => setIsPaused(bool)}
                  setSeenStories={setSeenStories}
                />
              ))}
            </div>

            <div className="relative flex justify-start items-center gap-3 w-full pt-4 z-20">
              <Link
                className="flex justify-start items-center gap-2 w-full overflow-hidden"
                to={`/profile/${storiesData?.clerkId}`}
              >
                <Avatar className="w-9 h-9 shrink-0 border border-white">
                  <AvatarImage
                    className="w-full h-full object-cover"
                    src={storiesData?.profilePicture}
                  />
                  <AvatarFallback className="w-full h-full object-cover">
                    {storiesData?.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                  <p className="w-full text-sm text-white font-semibold truncate">
                    {storiesData?.fullName}
                  </p>

                  <p
                    className="text-xs text-neutral-300 truncate"
                    title={dayjs(currentStory?.updatedAt).format("MMMM D, YYYY - hh:mm A")}
                  >
                    {dayjs(currentStory?.updatedAt).format("MM-D-YYYY")}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1 ml-auto">
                <button
                  className="p-1 text-white cursor-pointer"
                  onClick={() => setIsPaused(paused => !paused)}
                >
                  {isPaused ?
                    <Play className="size-4.5 fill-white" /> :
                    <Pause className="size-4.5 fill-white" />
                  }
                </button>

                {userId === storiesData?.clerkId &&
                  <>
                    <DeleteStoryModal
                      storyId={activeStoryId}
                      isOpen={openDeleteModal}
                      setIsOpen={(open) => setOpenDeleteModal(open)}
                      setIsPaused={(paused) => setIsPaused(paused)}
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
              </div>
            </div>

            {/* Contenido de texto del story (si lo hay) */}
            {currentStory.content && (
              <div
                style={{ backgroundColor: currentStory.textBgColor }}
                className="w-full max-w-[90%] h-auto mx-auto my-auto p-2 translate-y-[-20px] rounded-md"
              >
                <p
                  style={{ color: currentStory?.textColor }}
                  className="text-2xl text-center leading-tight text-shadow-lg font-semibold whitespace-pre-wrap"
                >
                  {currentStory.content}
                </p>
              </div>
            )}

            {/* Usuarios que vieron la historia */}
            {currentUser?._id === currentStory.user &&
              <SeenByUsers
                className="absolute bottom-4 left-5 z-10"
                data={currentStory.seenBy}
              />
            }
          </div>

          {currentUser?._id !== currentStory.user &&
            <Button
              className="absolute bottom-4 right-5 group hover:bg-transparent cursor-pointer z-10"
              variant="ghost"
              size="icon"
              onClick={() => toggleStoryLike()}
              disabled={isTogglingLikeStory}
            >
              {currentStory.likedBy.some((like) => like.user === currentUser?._id) ? (
                <FaHeart
                  className="size-5.5 text-destructive group-hover:scale-110 transition-all"
                  aria-hidden
                />
              ) : (
                <FaRegHeart
                  className="size-5.5 text-destructive group-hover:scale-110 transition-all"
                  aria-hidden
                />
              )}

              <span className="sr-only">
                {currentStory.likedBy.some((like) => like.user === currentUser?._id) ?
                  "Eliminar like de la historia" :
                  "Dar like a la historia"
                }
              </span>
            </Button>
          }
        </div>
      }
    </div>
  )
}

export default StoriesViewer