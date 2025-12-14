import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { CirclePlus, ImagePlus, TypeOutline } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import { LuMessageCircle, LuSearch, LuUserRound } from "react-icons/lu";
import { MdNotifications } from "react-icons/md";
import { AiOutlineMenu } from "react-icons/ai";
import SidebarItem from "./SidebarItem";
import ProfileLinkItem from "./ProfileLinkItem";
import LogoutItem from "./LogoutItem";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import logo from "@/assets/logo-simple.webp";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const createPostBtnRef = useRef<HTMLButtonElement | null>(null);

  const {pathname} = useLocation();
  
  const {user, loadingUser} = useCurrentUser();

  const {unseenNotifications} = useUnseenNotifications();

  const {unreadChats} = useUnreadChats();

  const {setOpen: openCreateStoryModal} = useCreatePublicationModal();

  if (!loadingUser && !user) return null;

  return (
    <aside className="flex flex-col justify-start gap-4 w-fit min-[950px]:w-[250px] shrink-0 h-screen p-4 pb-0 border-r bg-gray-50">
      <Link
        className="flex justify-start items-center gap-2 w-full"
        to="/"
      >
        <img
          className="w-[30px] h-auto"
          src={logo}
          alt="logo"
          aria-hidden
        />

        <h1 className="hidden min-[950px]:block text-lg text-neutral-900">
          SnapGram
        </h1>

        <h1 className="block min-[950px]:hidden text-xl text-neutral-900">
          SG
        </h1>
      </Link>

      <ul className="flex flex-col gap-2 w-full">
        <SidebarItem
          href="/"
          title="Inicio"
          Icon={GoHomeFill}
        />

        <SidebarItem
          href="/messages"
          title="Mensajes"
          Icon={LuMessageCircle}
          badge={unreadChats.length > 0 ? unreadChats.length : undefined}
        />

        <SidebarItem
          href="/notifications"
          title="Notificaciones"
          Icon={MdNotifications}
          badge={unseenNotifications > 0 ? unseenNotifications : undefined}
        />

        <SidebarItem
          href="/discover"
          title="Descubre"
          Icon={LuSearch}
        />

        <SidebarItem
          href={`/profile/${user?.clerkId}`}
          title="Perfil"
          Icon={LuUserRound}
        />
      </ul>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={createPostBtnRef}
            className="flex justify-center items-center gap-2 w-full px-4 py-2 text-base text-white rounded-md bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
          >
            <CirclePlus className="!size-6" aria-hidden />

            <span className="hidden min-[950px]:inline">
              Crear
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem
            className="flex justify-start items-center gap-2 w-full h-full cursor-pointer"
            onClick={() => openCreateStoryModal({open: true, publicationType: "post"})}
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="whitespace-nowrap">Crear publicación</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex justify-start items-center gap-2 cursor-pointer"
            onClick={() => openCreateStoryModal({open: true, publicationType: "story"})}
          >
            <TypeOutline className="size-5" aria-hidden />

            <span className="whitespace-nowrap">
              Crear historia
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-full mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn("justify-start w-full h-auto mb-3 py-3 cursor-pointer", !pathname.startsWith("/messages") && "min-[1280px]:hidden")}
              variant="ghost"
              size="lg"
            >
              <AiOutlineMenu className="size-6 text-neutral-700" aria-hidden/>

              <span className="hidden min-[950px]:inline text-base text-neutral-900">
                Más
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-full p-0" side="top">
            <DropdownMenuItem className="w-full px-1">
              <ProfileLinkItem user={user!} />
            </DropdownMenuItem>

            <Separator className="w-full bg-neutral-200" />

            <DropdownMenuItem className="w-full px-1">
              <LogoutItem />
            </DropdownMenuItem>

            <Separator className="w-full bg-neutral-200" />

            <div className="block min-[950px]:hidden w-full px-4 py-3">
              <p className="text-xs text-neutral-500">
                &copy; {new Date().getFullYear()} - Desarrollado por <span className="font-semibold">Jesús Guzmán</span>
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="w-full bg-neutral-200" />

        <div className="hidden min-[950px]:block w-full px-4 pt-2 pb-3">
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} - Desarrollado por <span className="font-semibold">Jesús Guzmán</span>
          </p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar