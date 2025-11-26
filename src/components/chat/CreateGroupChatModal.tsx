import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import GroupChatModalItem from "./GroupChatModalItem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getUsersList } from "@/utils/getUsersList";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

const CreateGroupChatModal = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsersIds, setSelectedUsersIds] = useState<string[]>([]);

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const {user: currentUser} = useCurrentUser();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Función para crear el grupo
  const createGroupChat = async () => {
    if (!currentUser) return;

    const token = await getToken();

    const {data} = await axiosInstance<{data: ChatType}>({
      method: "POST",
      url: "/chats/create",
      headers: {
        Authorization: `Bearer ${token}`
      },
      data: {
        type: "group",
        participants: selectedUsersIds,
        groupName,
        groupAdmin: currentUser._id
      }
    });

    return data;
  }

  // Mutation para crear el grupo
  const {mutate: createGroupChatMutation, isPending: isCreatingGroup} = useMutation({
    mutationFn: createGroupChat,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["chats"]});
      navigate(`/messages/${data?.data._id}`);
    },
    onError: (error: any) => {
      toast.error(errorMessage(error));
    }
  });

  const {
    users,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    usersError
  } = getUsersList({ isOpen });

  const {isIntersecting} = useIntersectionObserver({ data: users, paginationRef });

  // Cargar la siguiente pagina de usuarios
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (usersError) {
    toast.error(errorMessage(usersError));
  }

  const usersData = users?.pages.flatMap((page) => page.data) ?? [];

  const isButtonDisabled = groupName.length === 0 || selectedUsersIds.length === 0 || isCreatingGroup;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="px-4 py-2 text-base text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
          variant="default"
        >
          Crear grupo
        </Button>
      </DialogTrigger>

      <DialogContent className="py-4">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-center">
            Nuevo grupo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 shrink-0">
          <Label
            htmlFor="name"
            className="text-sm text-neutral-900"
          >
            Nombre del grupo
          </Label>
          
          <Input
            ref={inputRef}
            id="name"
            placeholder="Grupo de amigos y familiares"
            disabled={isCreatingGroup}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <p className="text-sm text-neutral-900 font-medium">
          Agregar miembros al grupo
        </p>

        <ul className="flex flex-col gap-2 w-full max-h-[450px] grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          
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

          {!isLoading && usersData.map((user) => {
            return (
              <li key={user._id} className="w-full">
                <GroupChatModalItem
                  key={user._id}
                  userData={user}
                  setSelectedUsersIds={setSelectedUsersIds}
                />
              </li>
            )
          })}

          {hasNextPage && !isFetchingNextPage &&
            <div ref={paginationRef} className="w-full h-10" />
          }
        </ul>

        <div className="w-full pt-4 pb-3 start-0 border-t">
          <Button
            className="w-full py-5 text-sm text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
            variant="default"
            disabled={isButtonDisabled}
            onClick={() => createGroupChatMutation()}
          >
            Crear grupo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateGroupChatModal