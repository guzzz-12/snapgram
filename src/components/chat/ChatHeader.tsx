import { useRef, useState, type RefObject } from "react";
import { Link } from "react-router";
import { Ellipsis, Loader2Icon } from "lucide-react";
import { FiLock } from "react-icons/fi";
import { BsTrash3 } from "react-icons/bs";
import { MdLogout } from "react-icons/md";
import { CiImageOn } from "react-icons/ci";
import UpdateGroupImgModal from "./UpdateGroupImgModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useImagePicker from "@/hooks/useImagePicker";
import { cn } from "@/lib/utils";
import type { ChatType } from "@/types/global";

interface Props {
  chatData: ChatType | null | undefined;
  isLoading: boolean;
  headerHeight: number;
  headerRef: RefObject<HTMLDivElement | null>;
}

const ChatHeader = ({ chatData, isLoading, headerHeight, headerRef }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {user: currentUser} = useCurrentUser();

  const {isProcessing, selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({
    fileInputRef,
    maxSize: 1000
  });

  const chatParticipants = chatData?.participants || [];

  // Si el chat es privado, mostrar el avatar del otro usuario
  // Si el chat es de grupo, mostrar el avatar del admin del grupo
  const recipient = chatData?.type === "private" ? chatParticipants.find((p) => p._id !== currentUser?._id) : chatData?.groupAdmin;

  if (!recipient && !isLoading) return null;

  return (
    <>
      {isLoading &&
        <>
          <div
            style={{height: `${headerHeight}px`}}
            className="flex justify-start gap-3 w-full px-6 py-2 bg-white border-b"
          >
            <Skeleton className="w-[50px] h-[50px] shrink-0 rounded-full bg-neutral-200" />

            <div className="flex flex-col justify-center items-start gap-2 w-full">
              <Skeleton className="w-[60%] h-4 rounded bg-neutral-200" />
              <Skeleton className="w-1/4 h-3 rounded bg-neutral-200" />
            </div>
          </div>

          <div className="flex justify-center items-center w-full h-full">
            <Loader2Icon className="size-8 text-neutral-600 animate-spin" />
          </div>
        </>
      }

      {!isLoading &&
        <div
          ref={headerRef}
          className="flex justify-between items-center gap-4 w-full px-6 py-2 bg-white border-b"
        >
          <UpdateGroupImgModal
            groupId={chatData?._id || ""}
            isProcessingImage={isProcessing}
            fileInputRef={fileInputRef}
            selectedImageFiles={selectedImageFiles}
            selectedImagePreviews={selectedImagePreviews}
            onImagePickHandler={onImagePickHandler}
            setSelectedImageFiles={setSelectedImageFiles}
            setSelectedImagePreviews={setSelectedImagePreviews}
          />

          <Link
            to={`/profile/${recipient?.clerkId}`}
            className="flex justify-start items-center gap-4 overflow-hidden"
          >
            <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-white">
              <AvatarImage 
                className="w-full h-full object-cover"
                src={chatData?.type === "group" ? chatData.groupPicture! : recipient?.profilePicture} 
              />
              
              <AvatarFallback>
                {chatData?.type === "group" ? "👥" : recipient?.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
              <p className="w-full font-semibold text-neutral-900 truncate">
                {chatData?.type === "group" ? chatData.groupName : recipient?.fullName}
              </p>  

              {chatData?.type !== "group" &&
                <p className="w-full text-sm text-neutral-700 truncate">
                  @{recipient?.username}
                </p>
              }
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn("flex justify-center items-center w-9 h-9 p-2 shrink-0 rounded-full bg-transparent hover:bg-neutral-200 cursor-pointer transition-colors")}
              >
                <Ellipsis className="size-5 text-neutral-700" aria-hidden />
                <span className="sr-only">
                  Opciones del chat
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              {chatData?.type === "private" &&
                <>
                  <DropdownMenuItem className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer">
                    <BsTrash3 className="size-5 text-destructive/60" />
                    <span className="text-sm text-destructive">
                      Eliminar chat
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer">
                    <FiLock className="size-5 text-neutral-500" />
                    <span className="text-sm text-neutral-900">
                      Bloquear a {recipient?.fullName.split(" ")[0]}
                    </span>
                  </DropdownMenuItem>
                </>
              }

              {chatData?.type === "group" &&
                <>
                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CiImageOn className="size-5 text-neutral-500" />
                    <span className="text-sm text-neutral-900">
                      Cambiar imagen del grupo
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer">
                    <MdLogout className="size-5 text-neutral-500" />
                    <span className="text-sm text-neutral-900">
                      Abandonar grupo
                    </span>
                  </DropdownMenuItem>

                  {currentUser?.clerkId === chatData?.groupAdmin?.clerkId &&
                    <DropdownMenuItem className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer">
                      <BsTrash3 className="size-5 text-destructive/60" />
                      <span className="text-sm text-destructive">
                        Eliminar grupo
                      </span>
                    </DropdownMenuItem>
                  }
                </>
              }
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    </>
  )
}

export default ChatHeader