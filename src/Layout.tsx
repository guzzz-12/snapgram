import { Outlet, useLocation } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Toaster } from "sonner";
import MainSidebar from "@/components/MainSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import CreatePostModal from "@/components/posts/CreatePostModal";
import SocketManager from "@/components/SocketManager";

const Layout = () => {
  const {pathname} = useLocation();

  const {isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  return (
    <SidebarProvider>
      <SocketManager />

      <div className="flex w-full min-h-screen">
        <CreatePostModal />

        <CreateStoryModal />

        {!pathname.startsWith("/post") &&        
          <MainSidebar />
        }

        <section className="grow bg-slate-100 overflow-x-hidden">
          <Outlet />
        </section>

        <Toaster position="bottom-right" />
      </div>
    </SidebarProvider>
  )
}

export default Layout