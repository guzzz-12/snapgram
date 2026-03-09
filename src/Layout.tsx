import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import Sidebar from "./components/Sidebar";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import CreatePostModal from "@/components/posts/CreatePostModal";
import BlockUserModal from "@/components/BlockUserModal";
import SocketManager from "@/components/SocketManager";
import ImagesLightbox from "@/components/ImagesLightbox";
import MobileNavSidebar from "./components/MobileNavSidebar";
import DisabledAccountScreen from "./components/DisabledAccountScreen";
import CreateCryptoKeysScreen from "./components/CreateCryptoKeysScreen";
import { TooltipProvider } from "./components/ui/tooltip";
import { useTitleNotificationsCounter } from "./hooks/useTitleNotificationsCounter";
import { useCurrentUser } from "./hooks/useCurrentUser";
import useWindowWidth from "./hooks/useWindowWidth";
import useSidebarWidth from "./hooks/useSidebarWidth";
import { useCheckLocalCryptoKeys } from "./hooks/useCheckLocalCryptoKeys";
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

  const {checkLocalCryptoKeys} = useCheckLocalCryptoKeys();

  useEffect(() => {
    checkLocalCryptoKeys();
  }, []);

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

  // Mostrar esta pantalla si la cuenta del usuario esta desactivada
  if (currentUser.isDisabled) {
    return (
      <DisabledAccountScreen
        isPending={isPending}
        isSigningOut={isSigningOut}
        mutate={mutate}
        signOutHandler={signOutHandler}
      />
    )
  }

  // Mostrar esta pantalla si el usuario no ha creado las claves de cifrado
  if (!currentUser.hasCryptoKeys) {
    return (
      <CreateCryptoKeysScreen operation="create" />
    )
  }

  return (
    <div
      // Aplicar padding a la izquierda para ajustar el sidebar en pantallas mayores a 700px
      style={{paddingLeft: windowWidth > 700 ? `${sidebarWidth}px` : 0}}
      className="relative flex w-full min-h-screen"
    >
      <TooltipProvider>
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
      </TooltipProvider>
    </div>
  )
}

export default Layout