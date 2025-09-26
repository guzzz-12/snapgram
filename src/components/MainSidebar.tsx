import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { CirclePlus, House, ImagePlus, LogOut, MessageCircle, Search, TypeOutline, UserRound, UsersRound } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem } from "./ui/sidebar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import logo from "@/assets/logo-simple.webp";
import { useCreateStoryModal } from "@/hooks/useCreateStoryModal";

const SIDEBAR_ITEMS = [
  {
    name: "Inicio",
    href: "/",
    icon: House
  },
  {
    name: "Mensajes",
    href: "/messages",
    icon: MessageCircle
  },
  {
    name: "Conexiones",
    href: "/connections",
    icon: UsersRound
  },
  {
    name: "Descubre",
    href: "/discover",
    icon: Search
  },
  {
    name: "Perfil",
    href: "/profile/user_2zdFoZib5lNr614LgkONdD8WG32",
    icon: UserRound
  },
];

const MainSidebar = () => {
  const createPostBtnRef = useRef<HTMLButtonElement | null>(null);

  const [createPostBtnWidth, setCreatePostBtnWidth] = useState(0);

  const {user, isLoaded} = useUser();
  const {signOut} = useClerk();

  const {setOpen: openCreateStoryModal} = useCreateStoryModal();

  // Establecer el ancho del dropdown igual al ancho del botón
  useEffect(() => {
    if (createPostBtnRef.current) {
      setCreatePostBtnWidth(createPostBtnRef.current.clientWidth);
    }
  }, []);

  if (isLoaded && !user) return null;

  return (
    <Sidebar className="bg-white">
      <SidebarHeader className="px-4 border-b overflow-hidden">
        <Link
          to="/"
          className="flex justify-start items-center gap-2 w-full"
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
        <SidebarMenu>
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarMenuItem key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) => (
                  `flex justify-start items-center gap-3 w-full h-full px-4 py-2 text-base rounded-md hover:!bg-indigo-50 transition-colors ${isActive ? "!bg-indigo-100" : "bg-transparent"}`
                )}
              >
                <item.icon className="!size-5 text-neutral-700" aria-hidden />
                {item.name}
              </NavLink>
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem className="mt-4" key="create-post">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  ref={createPostBtnRef}
                  className="flex justify-center items-center gap-2 w-full h-full px-4 py-2 text-base text-white rounded-md bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                >
                  <CirclePlus className="!size-5" aria-hidden />
                  <span>Crear Post</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent style={{ width: `${createPostBtnWidth}px` }}>
                <DropdownMenuItem asChild>
                  <Link
                    className="flex justify-start items-center gap-2 w-full h-full cursor-pointer"
                    to="/create-post"
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    <span>Crear publicación</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="flex justify-start items-center gap-2 cursor-pointer"
                  onClick={() => openCreateStoryModal(true)}
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
              {user?.firstName} {user?.lastName}
            </p>
            
            <p className="w-full text-xs text-left text-neutral-500 truncate">
              {user?.emailAddresses[0].emailAddress}
            </p>
          </div>

          <LogOut className="ml-auto size-4 text-neutral-500 shrink-0" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

export default MainSidebar