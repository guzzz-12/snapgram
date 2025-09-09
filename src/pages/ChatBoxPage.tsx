import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { toast } from "sonner";
import ChatHeader from "@/components/chat/ChatHeader";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ChatContent from "@/components/chat/ChatContent";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { dummyUsersData } from "@/dummy-data";

const ChatBoxPage = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const {userId} = useParams<{userId: string}>();

  const [headerHeight, setHeaderHeight] = useState(0);

  const currentUser = dummyUsersData.find((user) => user._id === "user_2zdFoZib5lNr614LgkONdD8WG32")!;
  const chatUser = dummyUsersData.find((user) => user._id === userId)!;

  // Ocultar el scrollbar del body
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.clientHeight);
    }
  }, [userId]);
  
  const user = dummyUsersData.find((user) => user._id === userId);

  if (!user || !userId) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex w-full h-[100vh] overflow-hidden">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      
      <ChatList headerHeight={headerHeight} />

      <section className="flex flex-col justify-start w-full overflow-hidden">
        <ChatHeader user={user} headerRef={headerRef} />
        <ChatContent currentUser={currentUser} chatUser={chatUser} />
        <ChatInput wrapperHeight={headerHeight} />
      </section>
    </main>
  )
}

export default ChatBoxPage