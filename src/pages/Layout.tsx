import { Outlet } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Toaster } from "sonner";
import MainSidebar from "@/components/MainSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Layout = () => {
  const {isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <MainSidebar />

        <section className="grow bg-slate-50">
          <Outlet />
        </section>

        <Toaster position="bottom-right" />
      </div>
    </SidebarProvider>
  )
}

export default Layout