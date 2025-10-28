import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IoFileTrayStackedOutline } from "react-icons/io5";
import RightSidebar from "@/components/RightSidebar";
import NotificationsList from "@/components/notifications/NotificationsList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { NotificationType } from "@/types/global";

const ConnectionsPage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const {getToken} = useAuth();

  const queryClient = useQueryClient();

  const {setUnseenNotifications} = useUnseenNotifications();

  const getNotifications = async (page: number, activeTab: "all" | "unread") => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: NotificationType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/notifications",
      params: {
        page,
        limit: 5,
        filter: activeTab
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    return data;
  }

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["notifications", activeTab],
    queryFn: async ({pageParam}) => getNotifications(pageParam, activeTab),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false
  });

  const {mutate: markAllAsSeen} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: "/notifications/unseen",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
      setUnseenNotifications(0);
    }
  });

  // Marcar todas las notificaciones como vistas al abrir la página
  useEffect(() => {
    setTimeout(() => {
      markAllAsSeen();
    }, 500);
  }, []);

  const {isIntersecting} = useIntersectionObserver({data, paginationRef});

  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (error) {
    toast.error(errorMessage(error));
  }

  const notifications = data?.pages.flatMap(page => page.data) || [];
  
  return (
    <main className="pageWrapper gap-10">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="flex flex-col gap-0 w-full max-w-[900px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">
            Notificaciones
          </h1>

          <p className="text-sm text-neutral-700">
            Administra tus notificaciones
          </p>
        </div>

        <Tabs
          className="w-fit mb-3 rounded-sm"
          value={activeTab}
          defaultValue="all"
          onValueChange={(value) => {
            setActiveTab(value as "all" | "unread");
          }}
        >
          <TabsList className="w-full h-[50px] gap-2 bg-white rounded-md">
            <TabsTrigger
              className="w-[90px] !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="all"
            >
              Todas
            </TabsTrigger>

            <TabsTrigger
              className="w-[90px] !text-[16px] !text-center font-normal bg-white rounded-t-xs rounded-b-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-[#4F39F6]/10"
              value="unread"
            >
              No leídas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <NotificationsList
          notifications={notifications}
          loading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
        />

        {notifications.length === 0 && !isLoading &&
          <div className="flex flex-col justify-center items-center gap-3 w-full h-full bg-neutral-50 rounded-lg shadow">
            <IoFileTrayStackedOutline className="size-24 text-neutral-500" />
            <p className="w-full text-center text-lg text-neutral-500">
              No tienes notificaciones
            </p>
          </div>
        }

        {hasNextPage &&
          <div ref={paginationRef} className="w-full h-4" />
        }

        {!hasNextPage && notifications.length > 0 &&
          <div className="w-full mt-auto pt-3 border-t border-neutral-300">
            <p className="w-full text-center text-sm text-neutral-600">
              No tienes más notificaciones
            </p>
          </div>
        }
      </section>

      <RightSidebar />
    </main>
  )
}

export default ConnectionsPage