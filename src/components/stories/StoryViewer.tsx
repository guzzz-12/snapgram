import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import { EllipsisVertical, Loader2Icon, Pause, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import StoryProgressBar from "./StoryProgressBar";
import DeleteStoryModal from "./DeleteStoryModal";
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTitle } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { StoryType } from "@/types/global";

interface Props {
  isOpen: boolean;
  storyId: string | null;
  setOpenStoryId: (storyId: string | null) => void;
}

const StoryViewer = ({ isOpen, storyId, setOpenStoryId }: Props) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const {getToken, userId} = useAuth();

  // Pausar/reanudar el story cuando se abre/cierra el modal de eliminar la historia
  useEffect(() => {
    setIsPaused(openDeleteModal);
  }, [openDeleteModal]);

  const {data: storyData, isFetching, error} = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const token = await getToken();

      const { data } = await axiosInstance<{data: StoryType}>({
        method: "GET",
        url: `/stories/${storyId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    retry: 2,
    enabled: isOpen
  });

  if (error) {
    const message = errorMessage(error);
    toast.error(message);
    return <Navigate to="/" replace />
  }

  const hasMedia = storyData?.mediaType === "image";

  if (isFetching) {
    return (
      <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black/70 z-50">
        <Loader2Icon className="size-9 text-white animate-spin" />
      </div>
    )
  }

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
          backgroundColor: storyData?.backgroundColor,
          backgroundImage: hasMedia ? `url(${storyData?.mediaUrl})` : "",
          backgroundSize: storyData?.imageSize,
          backgroundPosition: hasMedia ? "center" : "",
          backgroundRepeat: hasMedia ? "no-repeat" : "",
        }}
        className="w-auto h-[95vh] p-0 aspect-[1/1.7] rounded-lg border-none overflow-hidden [&>button]:hidden"
      >
        <DialogTitle className="sr-only">
          Historia de {storyData?.user.fullName}
        </DialogTitle>

        <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
          {/* Header del story */}
          <div className="relative flex justify-start items-center gap-3 bg-linear-to-b from-black to-transparent p-4 pb-6">
            <StoryProgressBar
              isOpen={isOpen}
              isPaused={isPaused}
              setOpenStoryId={setOpenStoryId}
              setIsPaused={(bool) => setIsPaused(bool)}
            />

            <Avatar className="size-10">
              <AvatarImage src={storyData?.user.profilePicture} />
              <AvatarFallback>
                {storyData?.user.fullName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-0.5 w-full overflow-hidden">
              <p className="text-white font-semibold truncate">
                {storyData?.user.fullName}
              </p>

              <p className="text-xs text-neutral-300 truncate">
                {dayjs(storyData?.updatedAt).format("hh:mm A, MMMM D, YYYY")}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="p-1 text-white cursor-pointer"
                onClick={() => setIsPaused(paused => !paused)}
              >
                {isPaused ?
                  <Play className="size-5.5 fill-white" /> :
                  <Pause className="size-5.5 fill-white" />
                }
              </button>

              {userId === storyData?.user.clerkId &&
                <>
                  <DeleteStoryModal
                    storyId={storyId || ""}
                    isOpen={openDeleteModal}
                    setOpenStoryId={() => setOpenStoryId(null)}
                    setIsOpen={(open) => setOpenDeleteModal(open)}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 cursor-pointer">
                        <EllipsisVertical
                          className="size-5.5 shrink-0 text-white"
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
                  <X className="size-6 shrink-0 text-white stroke-3" aria-hidden />
                  <span className="sr-only">Cerrar</span>
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Contenido de texto del story (si lo hay) */}
          {storyData?.content && (
            <button
              style={{backgroundColor: storyData?.textBgColor}}
              className="w-full max-w-[90%] h-auto mx-auto my-auto p-2 translate-y-[-20px] rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-[transparent]"
              aria-describedby="story-content-description"
            >
              <p
                style={{color: storyData?.textColor}}
                className="text-2xl text-center leading-tight text-shadow-lg font-semibold whitespace-pre-wrap"
              >
                {storyData?.content}
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