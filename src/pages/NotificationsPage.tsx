import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import RightSidebar from "@/components/RightSidebar";
import NotificationsList from "@/components/notifications/NotificationsList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { NotificationType } from "@/types/global";

const ConnectionsPage = () => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const getNotifications = async (page: number) => {
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
        limit: 5
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data;
  }

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: async ({pageParam}) => getNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null
  });

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

      <section className="flex flex-col gap-6 w-full max-w-[900px] mx-auto">
        <div className="">
          <h1 className="text-2xl font-semibold">
            Notificaciones
          </h1>

          <p className="text-sm text-neutral-700">
            Administra tus notificaciones
          </p>
        </div>

        <NotificationsList
          notifications={notifications}
          loading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
        />

        {hasNextPage &&
          <div ref={paginationRef} className="w-full h-4" />
        }

        {!hasNextPage &&
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