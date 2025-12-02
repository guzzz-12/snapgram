import { useState, type RefObject } from "react";
import { Link } from "react-router";
import { Ellipsis, Info, Loader2Icon } from "lucide-react";
import { FiLock } from "react-icons/fi";
import { BsTrash3 } from "react-icons/bs";
import { MdLogout, MdOutlinePersonAddAlt } from "react-icons/md";
import { FaRegImage } from "react-icons/fa";
import UpdateGroupImgModal from "./UpdateGroupImgModal";
import AddMemberToGroupModal from "./AddMemberToGroupModal";
import LeaveOrKickFromGroupModal from "./LeaveOrKickFromGroupModal";
import DeleteGroupModal from "./DeleteGroupModal";
import GroupInfoModal from "./GroupInfoModal";
import DeletePrivateChatModal from "./DeletePrivateChatModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { ChatType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  chatData: ChatType | null | undefined;
  isLoading: boolean;
  headerHeight: number;
  headerRef: RefObject<HTMLDivElement | null>;
}

const ChatHeader = ({ chatData, isLoading, headerHeight, headerRef }: Props) => {
  // State del modal de agregar miembros al grupo
  const [openAddMemberModal, setOpenAddMemberModal] = useState(false);

  // State del modal de eliminar miembro del grupo
  const [modalState, setModalState] = useState<{isOpen: boolean, operation: "Abandonar" | "Eliminar" | null}>({
    isOpen: false,
    operation: null
  });

  const [openGroupInfoModal, setOpenGroupInfoModal] = useState(false);

  const [openUpdateGroupImgModal, setOpenUpdateGroupImgModal] = useState(false);

  const [openDeleteGroupModal, setOpenDeleteGroupModal] = useState(false);
  
  const [openDeletePrivateChatModal, setOpenDeletePrivateChatModal] = useState(false);

  const {user: currentUser} = useCurrentUser();

  const chatParticipants = chatData?.participants || [];

  // Si el chat es privado, mostrar el avatar del otro usuario
  // Si el chat es de grupo, mostrar el avatar del admin del grupo
  const recipient = chatData?.type === "private" ? chatParticipants.find((p) => p._id !== currentUser?._id) : chatData?.groupAdmin;

  if (!recipient && !isLoading) return null;

  return (
    <>
      <GroupInfoModal
        groupId={chatData?._id}
        isOpen={openGroupInfoModal}
        setIsOpen={setOpenGroupInfoModal}
      />

      <UpdateGroupImgModal
        groupId={chatData?._id || ""}
        isOpen={openUpdateGroupImgModal}
        setIsOpen={setOpenUpdateGroupImgModal}
      />

      <AddMemberToGroupModal
        isOpen={openAddMemberModal}
        chatData={chatData}
        setIsOpen={setOpenAddMemberModal}
      />

      <LeaveOrKickFromGroupModal
        chatData={chatData}
        modalState={modalState}
        setModalState={setModalState}
      />

      <DeleteGroupModal
        isOpen={openDeleteGroupModal}
        setIsOpen={setOpenDeleteGroupModal}
        groupData={chatData}
      />

      <DeletePrivateChatModal
        chatData={chatData}
        isOpen={openDeletePrivateChatModal}
        setIsOpen={setOpenDeletePrivateChatModal}
      />

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
          <Link
            to={chatData?.type === "group" ? "#" : `/profile/${recipient?.clerkId}`}
            className="flex justify-start items-center gap-4 overflow-hidden"
            onClick={(e) => {
              if(chatData?.type === "group") {
                e.preventDefault();
                setOpenGroupInfoModal(true);
              }
            }}
          >
            <Avatar className="w-[50px] h-[50px] shrink-0 outline-2 outline-white">
              <AvatarImage 
                className="w-full h-full object-cover"
                src={chatData?.type === "group" ? chatData.groupPicture! : recipient?.profilePicture} 
              />
              
              <AvatarFallback>
                {chatData?.type === "group" ? chatData.groupName?.charAt(0).toUpperCase() : recipient?.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
              <p className="w-full font-semibold text-neutral-900 truncate">
                {chatData?.type === "group" ? chatData.groupName : recipient?.fullName}
              </p>

              {chatData?.type !== "group" &&
                <p className="w-full text-xs text-neutral-700 truncate">
                  @{recipient?.username}
                </p>
              }

              {chatData?.type === "group" &&
                <p className="w-full text-xs text-neutral-700 truncate">
                  Creado por {chatData.groupAdmin?.fullName}
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
                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer"
                    onClick={() => setOpenDeletePrivateChatModal(true)}
                  >
                    <BsTrash3 className="size-5 text-destructive/60" aria-hidden />
                    <span className="text-sm text-destructive">
                      Eliminar chat
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer">
                    <FiLock className="size-5 text-neutral-500" aria-hidden />
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
                    onClick={() => setOpenGroupInfoModal(true)}
                  >
                    <Info className="size-5 text-neutral-900" aria-hidden />
                    <span className="text-sm">
                      Información del grupo
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer"
                    onClick={() => setOpenUpdateGroupImgModal(true)}
                  >
                    <FaRegImage className="size-5 text-neutral-900" aria-hidden />
                    <span className="text-sm text-neutral-900">
                      Cambiar imagen del grupo
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer"
                    onClick={() => setOpenAddMemberModal(true)}
                  >
                    <MdOutlinePersonAddAlt className="size-6 text-neutral-900" aria-hidden />
                    <span className="text-sm text-neutral-900">
                      Agregar miembros
                    </span>
                  </DropdownMenuItem>

                  {chatData.groupAdmin?._id !== currentUser?._id &&
                    <DropdownMenuItem
                      className="flex justify-start items-center gap-2 w-full px-4 py-2 bg-destructive/5 cursor-pointer"
                      onClick={() => setModalState({isOpen: true, operation: "Abandonar"})}
                    >
                      <MdLogout className="size-5 text-destructive" aria-hidden />
                      <span className="text-sm text-destructive">
                        Abandonar grupo
                      </span>
                    </DropdownMenuItem>
                  }

                  {currentUser?.clerkId === chatData?.groupAdmin?.clerkId &&
                    <DropdownMenuItem
                      className="flex justify-start items-center gap-2 w-full px-4 py-2 cursor-pointer"
                      onClick={() => setOpenDeleteGroupModal(true)}
                    >
                      <BsTrash3 className="size-5 text-destructive/90" aria-hidden />
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