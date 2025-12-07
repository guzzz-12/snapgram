import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import BlockedUserListItem from "./BlockedUserListItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

interface Props {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const BlockedUsersListModal = ({ isOpen, setIsOpen }: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const {getToken} = useAuth();

  const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["blocked-users"],
    queryFn: async ({pageParam}) => {
      const token = await getToken();

      const {data} = await axiosInstance<{
        data: {
          blockedBy: string;
          blockedUser: UserType;
          createdAt: string;
        }[];
        hasMore: boolean;
        nextPage: number | null;
      }>({
        method: "GET",
        url: "/block",
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: pageParam,
          limit: 10
        }
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    enabled: isOpen
  });

  // Observar cuando el usuario llega al final del viewport
  const {isIntersecting} = useIntersectionObserver({
    data,
    paginationRef
  });

  // Consultar la siguiente página de mensajes al llegar al final del viewport
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (error) {
    toast.error(errorMessage(error));
  }

  const blockedUsers = data?.pages.flatMap(page => page.data) || [];
  
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Perfiles bloqueados
          </DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-2 w-full max-h-[60vh] overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="w-full rounded-md overflow-hidden"
              >
                <Skeleton className="w-full h-[50px] rounded-md" />
              </li>
            ))
          }

          {!isLoading && blockedUsers.map(data => (
            <BlockedUserListItem
              key={data.blockedUser._id}
              data={data}
            />
          ))}

          {!isLoading && blockedUsers.length === 0 &&
            <li className="w-full p-3 border rounded-md">
              <p className="w-full text-center text-sm text-neutral-900">
                No tienes perfiles bloqueados
              </p>
            </li>
          }

          {isFetchingNextPage &&
            Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="w-full rounded-md overflow-hidden"
              >
                <Skeleton className="w-full h-[50px] rounded-md" />
              </li>
            ))
          }

          {hasNextPage &&
            <div ref={paginationRef} className="w-full h-6" />
          }
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export default BlockedUsersListModal