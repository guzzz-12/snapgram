import { useEffect, useRef, useState, type MouseEvent } from "react";
import dayjs from "dayjs";
import { Calendar, MapPin, MoreHorizontal, Pencil } from "lucide-react";
import { RiUserForbidLine } from "react-icons/ri";
import { MdNoAccounts } from "react-icons/md";
import { FaRegTrashCan } from "react-icons/fa6";
import ProfileEditModal from "./ProfileEditModal";
import BlockedUsersListModal from "./BlockedUsersListModal";
import DisableAccountModal from "./DisableAccountModal";
import DeleteAccountModal from "./DeleteAccountModal";
import SeeMoreBtn from "@/components/SeeMoreBtn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProfileService } from "@/services/profileService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useClampedText from "@/hooks/useClampedText";
import { useBlockUserModal } from "@/hooks/useBlockUserModal";
import useWindowWidth from "@/hooks/useWindowWidth";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";
import type { UserType } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  userData: UserType;
}

const ProfileHeader = ({ userData }: Props) => {
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const textContentRef = useRef<HTMLParagraphElement>(null);

  const [avatarHeight, setAvatarHeight] = useState(0);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openBlockedUsersModal, setOpenBlockedUsersModal] = useState(false);
  const [openDisableAccountModal, setOpenDisableAccountModal] = useState(false);
  const [openDeleteAccountModal, setOpenDeleteAccountModal] = useState(false);

  const {user} = useCurrentUser();

  const {windowWidth} = useWindowWidth();

  const {setImages, setOpen} = useImagesLighbox();

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, clampedTextData: userData.bio });

  const {setOpen: setBlockUserModalOpen, setOperation, setBlockedUser} = useBlockUserModal();

  const {followOrUnfollowUser} = useProfileService();

  useEffect(() => {
    if (avatarRef.current) {
      setAvatarHeight(avatarRef.current.clientHeight);
    }
  }, []);

  // Mutation para seguir o dejar de seguir al usuario
  const {mutate, isPending} = followOrUnfollowUser(userData._id, userData.clerkId);

  // Si lo está siguiendo, cambia el texto del botón al hacer hover
  const onMouseFollowBtnEnter = (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    if (userData.isFollowing) {
      e.currentTarget.textContent = "Dejar de seguir";
    }
  }

  // Si lo está siguiendo, restablecer el texto del botón al hacer hover
  const onMouseFollowBtnLeave = (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    if (userData.isFollowing) {
      e.currentTarget.textContent = "Siguiendo";
    }
  }

  return (
    <div className="block bg-slate-50 shadow overflow-hidden">
      <ProfileEditModal
        userData={userData}
        isOpen={openEditModal}
        onClose={(open: boolean) => setOpenEditModal(open)}
      />

      <BlockedUsersListModal
        isOpen={openBlockedUsersModal}
        setIsOpen={setOpenBlockedUsersModal}
      />

      <DisableAccountModal
        isOpen={openDisableAccountModal}
        setIsOpen={setOpenDisableAccountModal}
      />

      <DeleteAccountModal
        isOpen={openDeleteAccountModal}
        setIsOpen={setOpenDeleteAccountModal}
        setOpenDisableAccountModal={setOpenDisableAccountModal}
      />

      <button
        className="relative w-full h-[200px] shadow-sm g-linear-to-r from-[#c8d3ff] to-[#fccee9] cursor-pointer group"
        onClick={() => {
          setImages([userData.coverPicture]);
          setOpen(true);
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 bg-black/20 z-10 transition-opacity" />

        <img
          className="w-full h-full object-cover object-center"
          src={userData.coverPicture || "/placeholder_image.webp"}
          alt={`Portada de ${userData.fullName}`}
        />
      </button>

      <div className="relative flex flex-col min-[850px]:flex-row w-full">
        <button
          className="absolute w-fit h-fit translate-y-[-50%] min-[850px]:static flex items-start shrink-0 pl-3 min-[450px]:pl-6 group cursor-pointer z-20"
          onClick={() => {
            setImages([userData.profilePicture]);
            setOpen(true);
          }}
        >
          <Avatar
            ref={avatarRef}
            className="w-[90px] h-[90px] min-[850px]:w-[120px] min-[850px]:h-[120px] shrink-0 outline-4 outline-white bg-black"
          >
            <AvatarImage
              className="w-full h-full object-cover group-hover:opacity-80 transition-colors"
              src={userData.profilePicture || "/default_avatar.webp"}
              alt={`Avatar de ${userData.fullName}`}
            />
            <AvatarFallback className="w-full h-full object-cover group-hover:opacity-80 transition-colors">
              {userData.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="sr-only">
            Mostrar avatar de {userData.fullName}
          </span>
        </button>

        <div
          style={{
            ...(windowWidth < 850 ? {paddingTop: `calc(0.5 * ${avatarHeight}px + 10px)`} : {})
          }}
          className="w-full p-3 min-[450px]:p-6"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="grow overflow-hidden">
              <h1 className="mb-0 text-2xl font-semibold truncate">
                {userData.fullName}
              </h1>

              <span className="text-neutral-700 truncate">
                @{userData.username}
              </span>
            </div>

            {user?._id === userData._id &&
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn("flex justify-center items-center w-9 h-9 p-2 shrink-0 rounded-full bg-transparent hover:bg-neutral-200 cursor-pointer transition-colors", isPending && "pointer-events-none")}>
                    <MoreHorizontal />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="flex flex-col gap-1">
                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 cursor-pointer"
                    onClick={() => setOpenEditModal(true)}
                  >
                    <Pencil className="size-5 text-neutral-700" aria-hidden />
                    <span>Editar perfil</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 cursor-pointer"
                    onClick={() => setOpenBlockedUsersModal(true)}
                  >
                    <RiUserForbidLine className="size-5 text-neutral-700" aria-hidden />
                    <span>Perfiles bloqueados</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 bg-destructive/5 hover:!bg-destructive/10 cursor-pointer"
                    onClick={() => setOpenDisableAccountModal(true)}
                  >
                    <MdNoAccounts className="size-5 text-destructive" aria-hidden />
                    <span className="text-destructive">Desactivar tu cuenta</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex justify-start items-center gap-2 bg-destructive/5 hover:!bg-destructive/10 cursor-pointer"
                    onClick={() => setOpenDeleteAccountModal(true)}
                  >
                    <FaRegTrashCan className="size-4.5 text-destructive" aria-hidden />
                    <span className="text-destructive">Eliminar tu cuenta</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }

            {(user?._id !== userData._id) &&
              <div className="flex justify-center items-center gap-3">
                <Button
                  className={cn("shrink-0 rounded-full cursor-pointer", userData.isFollowing && "hover:text-red-600 hover:border-red-600 hover:bg-red-50")}
                  variant="outline"
                  disabled={isPending}
                  onMouseEnter={onMouseFollowBtnEnter}
                  onMouseLeave={onMouseFollowBtnLeave}
                  onClick={() => mutate()}
                >
                  {userData.isFollowing ? "Siguiendo" : "Seguir"}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="shrink-0 rounded-full border-destructive cursor-pointer"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setBlockUserModalOpen(true);
                        setBlockedUser(userData);
                        setOperation("block");
                      }}
                    >
                      <RiUserForbidLine className="size-5 text-destructive" aria-hidden />
                      <span className="sr-only">Bloquear a {userData.fullName}</span>
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    Bloquear a {userData.fullName.split(" ")[0]}
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          </div>

          <div className="flex items-center gap-1 mb-4 text-neutral-500">
            <Calendar className="size-4" />
            <span className="text-sm truncate">
              {dayjs(userData.createdAt).format("[Se unió el] DD [de] MMMM [de] YYYY")}
            </span>
          </div>

          {userData.bio &&
            <div className="max-h-[450px] mb-4 pt-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 border-t">
              <p
                ref={textContentRef}
                className={cn("inline-block pt-2 text-left text-neutral-700 whitespace-pre-wrap", showFullText ? "line-clamp-none" : "line-clamp-3")}
              >
                {userData.bio}
              </p>

              {isClamped &&
                <SeeMoreBtn
                  isClamped={isClamped}
                  setIsClamped={setIsClamped}
                  setShowFullText={setShowFullText}
                />
              }
            </div>
          }

          <div className="flex justify-start items-center gap-9">
            {userData.location &&
              <div className="flex items-center gap-2 text-neutral-500">
                <MapPin className="size-5" />
                <span className="text-sm truncate">
                  {userData.location}
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader