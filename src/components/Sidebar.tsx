import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { CirclePlus, ImagePlus, TypeOutline } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import { LuMessageCircle, LuSearch, LuUserRound } from "react-icons/lu";
import { MdNotifications } from "react-icons/md";
import { FiMoreHorizontal } from "react-icons/fi";
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
import useSidebarWidth from "@/hooks/useSidebarWidth";
import logo from "@/assets/logo-simple.webp";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const createPostBtnRef = useRef<HTMLButtonElement | null>(null);

  const { pathname } = useLocation();

  const { setSidebarWidth } = useSidebarWidth();

  // Calcular el width del sidebar principal
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const sidebar = entries[0];
      setSidebarWidth(sidebar.target.clientWidth);
    });

    if (sidebarRef.current) {
      resizeObserver.observe(sidebarRef.current);
    }

    return () => {
      if (sidebarRef.current) {
        resizeObserver.unobserve(sidebarRef.current);
      }
    }
  }, [pathname]);

  const { user, loadingUser } = useCurrentUser();

  const { unseenNotifications } = useUnseenNotifications();

  const { unreadChats } = useUnreadChats();

  const { setOpen: openCreateStoryModal } = useCreatePublicationModal();

  const isMessagesPage = pathname.startsWith("/messages");

  const isStoriesPage = pathname.startsWith("/stories");

  if ((!loadingUser && !user) || isStoriesPage) {
    return null;
  };

  return (
    <aside
      ref={sidebarRef}
      className="flex flex-col justify-start gap-4 w-fit min-[950px]:w-[200px] min-[1100px]:w-[250px] shrink-0 h-screen px-1.5 pt-4 pb-0 border-r bg-gray-50"
    >
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

        <h1 className="text-neutral-900 font-semibold">
          <span className="hidden min-[950px]:block text-lg">
            SnapGram
          </span>

          <span className="block min-[950px]:hidden text-xl">
            SG
          </span>
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
            onClick={() => openCreateStoryModal({ open: true, publicationType: "post" })}
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="whitespace-nowrap">Crear publicación</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex justify-start items-center gap-2 cursor-pointer"
            onClick={() => openCreateStoryModal({ open: true, publicationType: "story" })}
          >
            <TypeOutline className="size-5" aria-hidden />

            <span className="whitespace-nowrap">
              Crear historia
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-full mt-0 min-[700px]:mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn("justify-center min-[950px]:justify-start w-full h-auto mb-3 py-3 cursor-pointer", !isMessagesPage && "min-[1280px]:hidden")}
              variant="ghost"
              size="lg"
            >
              <FiMoreHorizontal className="size-6 text-neutral-700" aria-hidden />

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

            <div className="block min-[950px]:hidden w-full p-3">
              <p className="text-xs text-neutral-500">
                &copy; {new Date().getFullYear()} - Desarrollado por <span className="font-semibold">Jesús Guzmán</span>
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="w-full mt-auto min-[700px]:mt-0 bg-neutral-200" />

      <div className="hidden min-[950px]:block w-full pb-3">
        <p className="text-xs text-center text-neutral-500">
          &copy; {new Date().getFullYear()} - Desarrollado por <span className="font-semibold">Jesús Guzmán</span>
        </p>
      </div>
    </aside>
  )
}

export default Sidebar