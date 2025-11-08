import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import UsersModalItem from "./UsersModalItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType, UserType } from "@/types/global";

interface Props {
  setTemporaryChat: (chat: ChatType) => void;
}

const UsersModalList = ({setTemporaryChat}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { getToken } = useAuth();

  // Función para consultar los usuarios que pueden ser agregados al chat
  const getUsers = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: UserType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/chats/get-users-to-chat",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5
      }
    });

    return data;
  }

  // Consultar la lista de usuarios para iniciar un chat
  const {data: users, error: usersError, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["get-users-list"],
    initialPageParam: 1,
    queryFn: ({pageParam}) => getUsers(pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: isOpen
  });

  const usersData = users?.pages.flatMap((page) => page.data) ?? [];

  // Consultar el chat con el usuario seleccionado
  const {refetch, isRefetching: isLoadingChat, error: loadingChatError} = useQuery({
    queryKey: ["get-chat-by-participant", selectedUserId],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "GET",
        url: `/chats/participant/${selectedUserId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled: false
  });

  const {isIntersecting} = useIntersectionObserver({ data: users, paginationRef });

  // Cargar la siguiente pagina de usuarios
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  // Navegar a la página del chat si existe el chat con el usuario seleccionado
  // Crear el item del chat temporal si el chat no existe entre los dos usuarios
  const onChatHandler = async () => {
    const {data} = await refetch();

    if (data) {
      navigate(`/messages/${data._id}`);

    } else {
      const otherUser = usersData.find((user) => user._id === selectedUserId)!;
      const tempChatId = `temp_${selectedUserId}`;

      setTemporaryChat({
        _id: tempChatId,
        participants: [otherUser],
        type: "private",
        groupAdmin: null,
        groupName: null,
        lastMessage: null,
        unseenMessages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigate(`/messages/${tempChatId}`);
    }
  }

  if (usersError) {
    toast.error(errorMessage(usersError));
  }
  
  if (loadingChatError) {
    toast.error(errorMessage(loadingChatError));
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setSelectedUserId(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="px-4 py-2 text-base text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
          variant="default"
        >
          Enviar mensaje
        </Button>
      </DialogTrigger>

      <DialogContent className="pt-4 pb-2">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-center">
            Nuevo mensaje
          </DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-2 w-full max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {/* Indicador de loading */}
          {isLoading &&
            Array(5).fill(0).map((_, i) => {
              return (
                <li key={i} className="w-full">
                  <Skeleton className="flex justify-start items-center gap-3 w-full p-2 bg-neutral-300">
                    <Skeleton className="w-[40px] h-[40px] shrink-0 rounded-full bg-neutral-100" />
                    <div className="flex flex-col justify-center items-start gap-2 w-full">
                      <Skeleton className="w-[80%] h-4 rounded bg-neutral-100" />
                      <Skeleton className="w-1/3 h-3 rounded bg-neutral-100" />
                    </div>
                  </Skeleton>
                </li>
              )
            })
          }

          <RadioGroup
            className="gap-2"
            onValueChange={(userId) => setSelectedUserId(userId)}
          >
            {!isLoading && usersData.map((user) => {
              return (
                <li key={user._id} className="w-full">
                  <UsersModalItem userData={user}/>
                </li>
              )
            })}
          </RadioGroup>

          {isFetchingNextPage &&
            Array(5).fill(0).map((_, i) => {
              return (
                <li key={i} className="w-full">
                  <Skeleton className="flex justify-start items-center gap-3 w-full p-2 bg-neutral-300">
                    <Skeleton className="w-[40px] h-[40px] shrink-0 rounded-full bg-neutral-100" />
                    <div className="flex flex-col justify-center items-start gap-2 w-full">
                      <Skeleton className="w-[80%] h-4 rounded bg-neutral-100" />
                      <Skeleton className="w-1/3 h-3 rounded bg-neutral-100" />
                    </div>
                  </Skeleton>
                </li>
              )
            })
          }

          {hasNextPage &&
            <div ref={paginationRef} className="w-full h-10" />
          }
        </ul>

        <div className="w-full pt-4 pb-3 border-t">
          <Button
            className="w-full py-5 text-sm text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
            variant="default"
            disabled={!selectedUserId || isLoadingChat}
            onClick={onChatHandler}
          >
            Chatear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UsersModalList