import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import UsersSearchBar from "./UsersSearchBar";
import UsersModalItem from "./PrivateChatsModalItem";
import ChatListItemSkeleton from "./ChatListItemSkeleton";
import UsersSearchNoResults from "./UsersSearchNoResults";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { useChatsService } from "@/services/chatsService";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { useDebounce } from "@/hooks/useDebounce";
import { usePrivateChatsListModal } from "@/hooks/usePrivateChatsListModal";
import { errorMessage } from "@/utils/errorMessage";
import type { ChatType } from "@/types/global";

interface Props {
  setTemporaryChat: (chat: ChatType | null) => void;
}

const PrivateChatsModalList = ({setTemporaryChat}: Props) => {
  const paginationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const {isOpen, setIsOpen} = usePrivateChatsListModal();

  const {debouncedValue} = useDebounce(searchTerm);

  const {getPrivateChatByRecipient, getUsersToChat} = useChatsService();

  // Consultar los usuarios que pueden ser agregados al chat
  const {
    usersData,
    usersError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = getUsersToChat({ isOpen, keyword: debouncedValue });

  // Consultar el chat con el usuario seleccionado
  const {isLoadingChat, loadingChatError, refetch} = getPrivateChatByRecipient(selectedUserId);

  const {isIntersecting} = useIntersectionObserver({ data: usersData, paginationRef });

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
    
    if (data?.data) {
      // setTemporaryChat(null);

      navigate(`/messages/${data.data._id}`);

    } else {
      const otherUser = usersData.find((user) => user._id === selectedUserId)!;
      const tempChatId = `temp_${selectedUserId}`;

      setTemporaryChat({
        _id: tempChatId,
        participants: [otherUser],
        type: "private",
        groupAdmin: null,
        groupName: null,
        groupPicture: null,
        groupDescription: null,
        lastMessage: null,
        unseenMessages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigate(`/messages/${tempChatId}`);
    }

    setIsOpen(false);
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
        setSearchTerm("");
      }}
    >
      <DialogContent className="pt-4 pb-2">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-center">
            Nuevo mensaje
          </DialogTitle>
        </DialogHeader>

        {/* Buscador de usuarios */}
        <UsersSearchBar
          searchTerm={searchTerm}
          autoFocus
          setSearchTerm={setSearchTerm}
        />

        <ul className="flex flex-col gap-2 w-full max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
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
            Array(3).fill(0).map((_, i) => {
              return (
                <li key={i} className="w-full">
                  <ChatListItemSkeleton />
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

export default PrivateChatsModalList