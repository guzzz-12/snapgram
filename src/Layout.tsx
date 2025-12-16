import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoInfo } from "react-icons/go";
import { toast, Toaster } from "sonner";
import Sidebar from "./components/Sidebar";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import CreatePostModal from "@/components/posts/CreatePostModal";
import BlockUserModal from "@/components/BlockUserModal";
import SocketManager from "@/components/SocketManager";
import ImagesLightbox from "@/components/ImagesLightbox";
import MobileNavSidebar from "./components/MobileNavSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTitleNotificationsCounter } from "./hooks/useTitleNotificationsCounter";
import { useCurrentUser } from "./hooks/useCurrentUser";
import useWindowWidth from "./hooks/useWindowWidth";
import useSidebarWidth from "./hooks/useSidebarWidth";
import { errorMessage } from "./utils/errorMessage";
import { axiosInstance } from "./utils/axiosInstance";
import { cn } from "./lib/utils";

const Layout = () => {
  const {pathname} = useLocation();

  const [isSigningOut, setIsSigningOut] = useState(false);

  const {isLoaded} = useUser();
  const {signOut, getToken} = useAuth();

  const queryClient = useQueryClient();

  const {user: currentUser} = useCurrentUser();

  const {windowWidth} = useWindowWidth();

  const {sidebarWidth} = useSidebarWidth();

  useTitleNotificationsCounter();

  // Mutation para reactivar la cuenta
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: "/users/reactivate-account",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["me"]});
      toast.success("Tu cuenta ha sido reactivada correctamente.");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  const signOutHandler = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error: any) {
      toast.error("Error al cerrar sesión. Inténtalo de nuevo.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const isPostPage = pathname.startsWith("/post");
  const isMessagesPage = pathname.startsWith("/messages");

  if (!isLoaded || !currentUser) {
    return null;
  }

  if (currentUser.isDisabled) {
    return (
      <main className="flex justify-center items-center w-full min-h-[100dvh] bg-slate-100">
        <section className="flex flex-col justify-center items-center px-10 py-4 border rounded-lg bg-white shadow">
          <h1 className="mb-2 text-center text-2xl text-neutral-900 font-semibold">
            ¿Reactivar tu cuenta?
          </h1>

          <div className="flex justify-center items-center gap-2">
            <GoInfo className="size-8 shrink-0 text-orange-700" />
            <p className="text-base text-left text-neutral-700 leading-tight">
              Desactivaste tu cuenta recientemente, <br /> para continuar debes reactivarla.
            </p>
          </div>

          <Separator className="w-full my-4 bg-neutral-200" />

          <div className="flex justify-center items-center gap-3 w-full">
            <Button
              className="cursor-pointer"
              variant="outline"
              disabled={isPending || isSigningOut}
              onClick={signOutHandler}
            >
              Cancelar
            </Button>

            <Button
              className="text-white bg-[#4F39F6] hover:bg-[#4F39F6]/80 cursor-pointer"
              disabled={isPending || isSigningOut}
              onClick={() => mutate()}
            >
              Reactivar
            </Button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div
      // Aplicar padding a la izquierda para ajustar el sidebar en pantallas mayores a 700px
      style={{paddingLeft: windowWidth > 700 ? `${sidebarWidth}px` : 0}}
      className="relative flex w-full min-h-screen"
    >
      <SocketManager />

      <CreatePostModal />

      <CreateStoryModal />

      <BlockUserModal />

      <ImagesLightbox />

      {/* No mostrar el sidebar en la página del post y o si el ancho de la pantalla es menor de 700px */}
      {!isPostPage &&
        <div className={cn("hidden min-[700px]:block fixed left-0 top-0 h-full shrink-0 z-10")}>
          <Sidebar />
        </div>
      }

      {!isMessagesPage && windowWidth < 700 &&
        <div className="fixed top-1 right-1 p-0.5 rounded-sm bg-white border z-[100]">
          <MobileNavSidebar />
        </div>
      }

      <section className="grow bg-slate-100 overflow-x-hidden">
        <Outlet />
      </section>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default Layout