import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { BsFillPencilFill } from "react-icons/bs";
import { MdOutlineExitToApp } from "react-icons/md";
import { FaCrown, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";
import { Loader2Icon, Plus } from "lucide-react";
import { toast } from "sonner";
import UpdateGroupImgModal from "./UpdateGroupImgModal";
import AddMemberToGroupModal from "./AddMemberToGroupModal";
import LeaveOrKickFromGroupModal from "./LeaveOrKickFromGroupModal";
import DeleteGroupModal from "./DeleteGroupModal";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import { Dialog, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useChatsService } from "@/services/chatsService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useClampedText from "@/hooks/useClampedText";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  groupId: string | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const GroupInfoModal = ({ groupId, isOpen, setIsOpen }: Props) => {
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const editDescriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const textContentRef = useRef<HTMLParagraphElement>(null);

  const [openGroupImgModal, setOpenGroupImgModal] = useState(false);
  const [openAddMemberModal, setOpenAddMemberModal] = useState(false);

  const [newDescription, setNewDescription] = useState("");
  const [isEditingGroupDescription, setIsEditingGroupDescription] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);

  const [openDeleteGroupModal, setOpenDeleteGroupModal] = useState(false);

  // State del modal de abandonar grupo o eliminar miembro del grupo
  const [leaveOrKickModalState, setLeaveOrKickModalState] = useState<{
    isOpen: boolean;
    operation: "Abandonar" | "Eliminar" | null;
    kickedUser?: UserType;
  }>({
    isOpen: false,
    operation: null,
    kickedUser: undefined
  });

  const {user: currentUser} = useCurrentUser();

  const {getGroupInfo, updateGroupInfo} = useChatsService();

  // Query para consultar la data del grupo
  const {data, isLoading, error} = getGroupInfo(groupId, isOpen);

  // Mutation para actualizar la información del grupo
  const {updateGroupInfoMutation, isUpdating} = updateGroupInfo({
    groupId, 
    groupName, 
    groupDescription: newDescription, 
    setIsEditingGroupDescription,
    setIsEditingGroupName
  });

  const {
    isClamped,
    showFullText,
    setIsClamped,
    setShowFullText,
  } = useClampedText({textContentRef, clampedTextData: data?.groupDescription || ""});

  // Inicializar el state de los inputs
  useEffect(() => {
    if (!data) return;

    setGroupName(data.groupName || "");
    setNewDescription(data.groupDescription || "");

    if (data.type !== "group") {
      setIsOpen(false);
    }
  }, [data]);

  if (error) {
    toast.error(errorMessage(error));
    setIsOpen(false);
  }

  const members = data?.participants || [];
  const isAdmin = data?.groupAdmin?._id === currentUser?._id;

  if (!groupId) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isLoading) {
          setIsOpen(isOpen);
        }
      }}
    >
      <UpdateGroupImgModal
        groupId={groupId}
        isOpen={openGroupImgModal}
        setIsOpen={setOpenGroupImgModal}
      />

      <AddMemberToGroupModal
        isOpen={openAddMemberModal}
        chatData={data}
        setIsOpen={setOpenAddMemberModal}
      />

      <LeaveOrKickFromGroupModal
        chatData={data}
        modalState={leaveOrKickModalState}
        setModalState={setLeaveOrKickModalState}
      />

      <DeleteGroupModal
        isOpen={openDeleteGroupModal}
        setIsOpen={setOpenDeleteGroupModal}
        groupData={data}
      />

      <DialogOverlay className="bg-black/70" />

      <DialogContent className="max-h-[90vh] gap-0 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
        <DialogHeader className="gap-0 overflow-hidden">
          <DialogTitle className="sr-only">
            Información del grupo
          </DialogTitle>
        </DialogHeader>

        {isLoading &&
          <div className="flex justify-center items-center w-full h-[240px]">
            <Loader2Icon className="w-8 h-8 text-neutral-700 animate-spin" />
          </div>
        }

        {data && !isLoading &&
          <div className="relative flex flex-col gap-4 w-full max-h-full pt-2 overflow-x-hidden overflow-y-auto">
            <div className="flex flex-col justify-center items-center gap-3 w-full">
              <div className="relative">
                <Avatar className="w-[120px] h-[120px] shrink-0 outline-4 outline-offset-1 outline-[#4F39F6]">
                  <AvatarImage
                    className="w-full h-full object-cover"
                    src={data.groupPicture || ""}
                  />
                  <AvatarFallback className="w-full h-full object-cover text-3xl text-white bg-[#4F39F6] font-semibold">
                    {data.groupName!.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {isAdmin &&
                  <div className="absolute bottom-0 right-0 flex justify-center items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="shrink-0 bg-white/80 hover:bg-white border-2 border-[#4F39F6] rounded-full cursor-pointer"
                          size="icon"
                          onClick={() => setOpenGroupImgModal(true)}
                        >
                          <BsFillPencilFill className="text-neutral-700" aria-hidden />
                          <span className="sr-only">
                            Cambiar foto del grupo
                          </span>
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        Cambiar foto del grupo
                      </TooltipContent>
                    </Tooltip>
                  </div>
                }
              </div>

              <div className="flex justify-center items-center gap-3 w-full">
                {(!isAdmin || !isEditingGroupName) &&
                  <h2 className="max-w-[80%] text-center text-xl text-neutral-900 font-semibold truncate">
                    {data.groupName}
                  </h2>
                }

                {isEditingGroupName &&
                  <Input
                    ref={editNameInputRef}
                    className="w-full"
                    type="text"
                    placeholder="Nombre del grupo"
                    disabled={isUpdating}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                }

                {isAdmin && !isEditingGroupName &&
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="shrink-0 rounded-full cursor-pointer"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsEditingGroupName(true);

                          // Hacer focus en el textarea
                          setTimeout(() => {
                            const input = editNameInputRef.current;
                            input?.focus();
                            const contentLength = input?.value.length || 0;
                            input?.setSelectionRange(contentLength, contentLength);
                          }, 0);
                        }}
                      >
                        <BsFillPencilFill className="text-neutral-700" aria-hidden />
                        <span className="sr-only">Editar nombre del grupo</span>
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                      Editar nombre del grupo
                    </TooltipContent>
                  </Tooltip>
                }

                {isAdmin && isEditingGroupName &&
                  <div className="flex justify-between items-center">
                    <Button
                      className="p-1 shrink-0 rounded-full cursor-pointer"
                      variant="ghost"
                      size="icon"
                      disabled={isUpdating}
                      onClick={() => updateGroupInfoMutation()}
                    >
                      <FaCircleCheck className="size-5 text-green-700" aria-hidden />
                      <span className="sr-only">Guardar cambios</span>
                    </Button>

                    <Button
                      className="p-1 shrink-0 rounded-full cursor-pointer"
                      variant="ghost"
                      size="icon"
                      disabled={isUpdating}
                      onClick={() => {
                        setIsEditingGroupName(false);
                      }}
                    >
                      <FaRegTimesCircle className="size-5 text-destructive" aria-hidden />
                      <span className="sr-only">Cancelar</span>
                    </Button>
                  </div>
                }
              </div>
            </div>

            {!isEditingGroupDescription &&
              <div className={cn("relative w-full max-h-[270px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 rounded-md bg-neutral-100", !isAdmin ? "p-3" : "p-3 pt-6 pr-6")}>
                {isAdmin &&
                  <Button
                    className="absolute top-0 right-0 shrink-0 rounded-full cursor-pointer"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingGroupDescription(true);
                      // Hacer focus en el textarea
                      setTimeout(() => {
                        const textarea = editDescriptionInputRef.current;
                        textarea?.focus();
                        const contentLength = textarea?.value.length || 0;
                        textarea?.setSelectionRange(contentLength, contentLength);
                      }, 0);
                    }}
                  >
                    <BsFillPencilFill className="size-3 text-neutral-900" aria-hidden />
                    <span className="sr-only">
                      Editar descripción del grupo
                    </span>
                  </Button>
                }

                <div>
                  <p
                    ref={textContentRef}
                    className={cn("w-full text-left text-sm text-neutral-900 whitespace-pre-wrap", showFullText ? "line-clamp-none" : "line-clamp-6")}
                  >
                    {data.groupDescription || "Sin descripción"}
                  </p>

                  {isClamped &&
                    <SeeMoreBtn
                      isClamped={isClamped}
                      setIsClamped={setIsClamped}
                      setShowFullText={setShowFullText}
                    />
                  }
                </div>
              </div>
            }

            {isAdmin && isEditingGroupDescription &&
              <div className="flex flex-col gap-2 w-full">
                <Label className="" htmlFor="description">
                  Editar descripción del grupo
                </Label>

                <Textarea
                  ref={editDescriptionInputRef}
                  id="description"
                  className="w-full max-h-[240px] resize-none border-none bg-neutral-100 focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100"
                  value={newDescription || data.groupDescription || ""}
                  placeholder="Añade una descripción al grupo..."
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                
                <div className="flex justify-end items-center gap-2 w-full">
                  <Button
                    className="w-fit cursor-pointer"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => setIsEditingGroupDescription(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    className="w-fit cursor-pointer"
                    variant="default"
                    disabled={isUpdating || newDescription.length === 0}
                    onClick={() => updateGroupInfoMutation()}
                  >
                    Guardar cambios
                  </Button>
                </div>

                <Separator className="w-full" />
              </div>
            }

            <div className="flex flex-col gap-4 p-3 bg-neutral-100 rounded-lg">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-left text-neutral-900 font-semibold">
                  {members.length} Miembros
                </h3>

                <Button
                  className="flex justify-center items-center gap-1 text-white rounded-md bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                  variant="default"
                  size="sm"
                  onClick={() => setOpenAddMemberModal(true)}
                >
                  <Plus className="size-5" aria-hidden />
                  <span className="text-sm">Agregar miembro</span>
                </Button>
              </div>

              <ul className="flex flex-col gap-2 w-full max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">
                {members.map(member => {
                  return (
                    <li
                      key={member.clerkId}
                      className="flex justify-between items-center gap-2 w-full px-2 py-3 bg-white rounded-md hover:bg-neutral-200 cursor-pointer transition-colors"
                    >
                      <Link
                        className="flex justify-start items-center gap-2 w-full overflow-hidden"
                        to={`/profile/${member.clerkId}`}
                      >
                        <Avatar className="w-[25px] h-[25px] shrink-0 rounded-full bg-neutral-100">
                          <AvatarImage
                            className="w-full h-full object-cover"
                            src={member.profilePicture}
                          />

                          <AvatarFallback className="w-full h-full object-cover">
                            {member.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <p className="w-full text-sm text-neutral-900 font-semibold truncate">
                          {member.fullName}
                        </p>

                        {member._id === data.groupAdmin?._id &&
                          <div className="flex justify-center items-center gap-1 shrink-0 px-1.5 py-0.5 bg-[#4f39f6] rounded">
                            <FaCrown className="w-3 h-3 text-yellow-300" />
                            <span className="text-xs text-neutral-200">
                              Admin
                            </span>
                          </div>
                        }
                      </Link>
                      
                      {isAdmin && member._id !== currentUser?._id &&
                        <Button
                          className="h-auto px-2 py-1.5 shrink-0 text-xs text-white cursor-pointer"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setLeaveOrKickModalState({
                              isOpen: true,
                              operation: "Eliminar",
                              kickedUser: member
                            })
                          }}
                        >
                          Expulsar
                        </Button>   
                      }
                    </li>
                  )
                })}
              </ul>

              <div className="flex justify-end items-center gap-2 w-full">
                {!isAdmin &&
                  <Button
                    className="w-full text-white cursor-pointer"
                    variant="destructive"
                    onClick={() => setLeaveOrKickModalState({isOpen: true, operation: "Abandonar"})}
                  >
                    <MdOutlineExitToApp className="size-5" aria-hidden />
                    Salir del grupo
                  </Button>
                }

                {isAdmin &&
                  <Button
                    className="w-full text-white cursor-pointer"
                    variant="destructive"
                    disabled={false}
                    onClick={() => setOpenDeleteGroupModal(true)}
                  >
                    <FaRegTrashAlt className="size-5" aria-hidden />
                    Eliminar grupo
                  </Button>
                }
              </div>
            </div>
          </div>
        }
      </DialogContent>
    </Dialog>
  )
}

export default GroupInfoModal