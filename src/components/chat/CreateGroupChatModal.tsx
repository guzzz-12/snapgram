import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UsersSearchBar from "./UsersSearchBar";
import GroupChatModalItem from "./GroupChatModalItem";
import ChatListItemSkeleton from "./ChatListItemSkeleton";
import UsersSearchNoResults from "./UsersSearchNoResults";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useGetUsersToChat } from "@/services/chats";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebounce } from "@/hooks/useDebounce";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

const CreateGroupChatModal = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsersIds, setSelectedUsersIds] = useState<string[]>([]);

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const {user: currentUser} = useCurrentUser();

  const {debouncedValue} = useDebounce(searchTerm);

  // Hacer focus en el input del nombre del grupo cuando se abre el modal
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
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      navigate(`/messages/${data?.data._id}`);
    },
    onError: (error: any) => {
      toast.error(errorMessage(error));
    }
  });

  const {
    usersData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    usersError
  } = useGetUsersToChat({ isOpen, keyword: debouncedValue });

  const {isIntersecting} = useIntersectionObserver({ data: usersData, paginationRef });

  // Cargar la siguiente pagina de usuarios
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  if (usersError) {
    toast.error(errorMessage(usersError));
  }

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

      <DialogContent className="gap-0 max-h-[90vh] py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <DialogHeader className="mb-4 pb-4 border-b">
          <DialogTitle className="text-center">
            Nuevo grupo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 shrink-0 mb-4 px-2 py-4 rounded-md bg-neutral-100">
          <Label
            htmlFor="groupName"
            className="text-sm text-neutral-900"
          >
            Nombre del grupo
          </Label>
          
          <Input
            ref={inputRef}
            id="groupName"
            className="bg-white"
            placeholder="Grupo de amigos y familiares"
            disabled={isCreatingGroup}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 w-full px-2 py-4 rounded-md bg-neutral-100">
          <p className="text-sm text-neutral-900 font-medium">
            Agregar miembros al grupo
          </p>

          {/* Buscador de usuarios */}
          <UsersSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          <Separator className="w-full bg-neutral-300" />

          <ul className="flex flex-col gap-2 w-full max-h-[400px] grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            {/* Indicador de loading */}
            {isLoading &&
              Array(3).fill(0).map((_, i) => {
                return (
                  <li key={i} className="w-full">
                    <ChatListItemSkeleton />
                  </li>
                )
              })
            }
            
            {!isLoading && debouncedValue && usersData.length === 0 &&
              <UsersSearchNoResults />
            }

            {!isLoading && usersData.map((user) => {
              return (
                <li key={user._id} className="w-full">
                  <GroupChatModalItem
                    key={user._id}
                    className="bg-white"
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
        </div>

        <div className="w-full mt-4">
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