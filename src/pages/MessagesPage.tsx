import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { LuSendHorizontal  } from "react-icons/lu";
import ChatList from "@/components/chat/ChatList";
import ChatInbox from "@/components/chat/ChatInbox";
import PrivateChatsModalList from "@/components/chat/PrivateChatsModalList";
import CreateGroupChatModal from "@/components/chat/CreateGroupChatModal";
import { Button } from "@/components/ui/button";
import { usePrivateChatsListModal } from "@/hooks/usePrivateChatsListModal";
import type { ChatType } from "@/types/global";

const MessagesPage = () => {
  const {chatId} = useParams<{chatId: string}>();
  const [searchParams] = useSearchParams();
  const chatTypeParam = searchParams.get("type") as "all" | "group" | null;

  const [headerHeight, setHeaderHeight] = useState(60);
  const [temporaryChat, setTemporaryChat] = useState<ChatType | null>(null);

  const {setIsOpen: setOpenPrivateChatsModal} = usePrivateChatsListModal();

  // Ocultar/mostrar el scrollbar del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <main className="flex w-full h-full bg-white overflow-hidden">
      <PrivateChatsModalList setTemporaryChat={setTemporaryChat}/>
      
      <ChatList
        headerHeight={headerHeight}
        temporaryChatItem={temporaryChat}
        chatTypeParam={chatTypeParam}
      />

      <section className="flex flex-col justify-start w-full h-screen">
        {chatId &&
          <ChatInbox
            chatId={chatId}
            temporaryChat={temporaryChat}
            headerHeight={headerHeight}
            setHeaderHeight={setHeaderHeight}
            setTemporaryChat={setTemporaryChat}
          />
        }

        {!chatId &&
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="flex justify-center items-center w-[120px] h-[120px] mb-2 shrink-0 rounded-full border-2 border-neutral-600">
              <LuSendHorizontal className="size-16 text-neutral-600 stroke-1" />
            </div>
            
            <h1 className="text-xl">
              {chatTypeParam === "all" && "Enviar mensaje"}
              {chatTypeParam === "group" && "Crear grupo"}
            </h1>

            <p className="mb-5 text-center text-sm text-neutral-600">
              Envia mensajes a tus amigos o grupos
            </p>

            {chatTypeParam === "all" &&
              <Button
                className="px-4 py-2 text-base text-white bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
                variant="default"
                onClick={() => setOpenPrivateChatsModal(true)}
              >
                Nuevo mensaje
              </Button>
            }

            {chatTypeParam === "group" &&
              <CreateGroupChatModal />
            }
          </div>
        }
      </section>
    </main>
  )
}

export default MessagesPage