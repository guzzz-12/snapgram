import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useClerk, UserButton } from "@clerk/clerk-react";
import { CirclePlus, ImagePlus, LogOut, TypeOutline } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import { LuMessageCircle, LuSearch, LuUserRound } from "react-icons/lu";
import { MdNotifications } from "react-icons/md";
import MainSidebarItem from "./MainSidebarItem";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem } from "./ui/sidebar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import logo from "@/assets/logo-simple.webp";

const MainSidebar = () => {
  const createPostBtnRef = useRef<HTMLButtonElement | null>(null);

  const [createPostBtnWidth, setCreatePostBtnWidth] = useState(0);
  
  const {user, loadingUser} = useCurrentUser();

  const {unseenNotifications} = useUnseenNotifications();

  const {signOut} = useClerk();

  const {setOpen: openCreateStoryModal} = useCreatePublicationModal();

  // Establecer el ancho del dropdown de creación de posts igual al ancho del botón
  useEffect(() => {
    if (createPostBtnRef.current) {
      setCreatePostBtnWidth(createPostBtnRef.current.clientWidth);
    }
  }, []);

  if (!loadingUser && !user) return null;

  return (
    <Sidebar className="bg-white">
      <SidebarHeader className="px-4 overflow-hidden">
        <Link
          className="flex justify-start items-center gap-2 w-full pt-2"
          to="/"
        >
          <img
            className="w-[30px] h-auto"
            src={logo}
            alt="logo"
            aria-hidden
          />

          <h1 className="text-lg text-neutral-900">
            SnapGram
          </h1>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarMenu className="gap-2">
          <MainSidebarItem
            href="/"
            title="Inicio"
            Icon={GoHomeFill}
          />

          <MainSidebarItem
            href="/messages"
            title="Mensajes"
            Icon={LuMessageCircle}
          />

          <MainSidebarItem
            href="/notifications"
            title="Notificaciones"
            Icon={MdNotifications}
            badge={unseenNotifications > 0 ? unseenNotifications : undefined}
          />

          <MainSidebarItem
            href="/discover"
            title="Descubre"
            Icon={LuSearch}
          />

          <MainSidebarItem
            href={`/profile/${user?.clerkId}`}
            title="Perfil"
            Icon={LuUserRound}
          />

          <SidebarMenuItem className="mt-4" key="create-post">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  ref={createPostBtnRef}
                  className="flex justify-center items-center gap-2 w-full h-full px-4 py-2 text-base text-white rounded-md bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                >
                  <CirclePlus className="!size-6" aria-hidden />
                  <span>Crear</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent style={{ width: `${createPostBtnWidth}px` }}>
                <DropdownMenuItem
                  className="flex justify-start items-center gap-2 w-full h-full cursor-pointer"
                  onClick={() => openCreateStoryModal({open: true, publicationType: "post"})}
                >
                  <ImagePlus className="size-5" aria-hidden />
                  <span>Crear publicación</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex justify-start items-center gap-2 cursor-pointer"
                  onClick={() => openCreateStoryModal({open: true, publicationType: "story"})}
                >
                  <TypeOutline className="size-5" aria-hidden />
                  <span>Crear historia</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mb-4">
        <Button
          className="flex justify-start items-center gap-2 h-full py-2 cursor-pointer"
          variant="ghost"
          size="default"
          onClick={() => signOut()}
        >
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <UserButton />
          </div>

          <div className="flex flex-col justify-center items-start gap-0 text-left overflow-hidden">
            <p className="w-full text-sm font-semibold text-neutral-900 truncate">
              {user?.fullName}
            </p>
            
            <p className="w-full text-xs text-left text-neutral-500 truncate">
              {user?.email}
            </p>
          </div>

          <LogOut className="ml-auto size-4 text-neutral-500 shrink-0" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

export default MainSidebar