import { useEffect, useState, type RefObject } from "react";
import type { Params } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { updateMsgDataCache } from "@/utils/updateMsgsDataCache";
import { socket } from "@/utils/socket";
import type { ChatType } from "@/types/global";

interface Props {
  wrapperRef: RefObject<HTMLDivElement | null>;
  isIntersecting: boolean;
  isLoadingMessages: boolean;
  chatData: ChatType | null | undefined;
  params: Readonly<Params<string>>;
  fetchNextPage: () => void;
}

/** Hooks necesarios para el funcionamiento de la bandeja de mensajes */
const useInboxHooks = (props: Props) => {
  const {
    wrapperRef,
    isIntersecting,
    isLoadingMessages,
    chatData,
    params,
    fetchNextPage
  } = props;

  // Distancia scrolleada desde el fondo de la bandeja de mensajes
  const [scrollFromBottom, setScrollFromBottom] = useState(0);

  const queryClient = useQueryClient();

  // Cargar la siguiente página de mensajes al llegar al top del chat
  useEffect(() => {
    if (isIntersecting && !isLoadingMessages) {
      wrapperRef.current!.scrollTop = 100;
      fetchNextPage()
    }
  }, [isIntersecting, isLoadingMessages]);

  // Scrollear al bottom de la bandeja de mensajes al entrar al chat
  useEffect(() => {
    if (wrapperRef.current && !isLoadingMessages && chatData) {
      const scrollHeight = wrapperRef.current.scrollHeight;

      setTimeout(() => {
        wrapperRef.current!.scrollTop = scrollHeight;
      }, 100);
    }
  }, [chatData, isLoadingMessages, params.chatId]);

  // Calcular la distancia scrolleada desde el fondo de la bandeja de mensajes
  useEffect(() => {
    const scrollHandler = (_e: Event) => {
      if (wrapperRef.current) {
        // Height total de la bandeja de mensajes incluyendo el scroll
        const scrollHeight = wrapperRef.current.scrollHeight;
  
        // Distancia scrolleada desde el fondo de la bandeja
        const scrollDistance = scrollHeight - (wrapperRef.current.scrollTop + wrapperRef.current!.clientHeight);
  
        setScrollFromBottom(scrollDistance);
      }
    }

    if (wrapperRef.current) {
      wrapperRef.current.addEventListener("scroll", scrollHandler);
    }

    return () => {
      if (wrapperRef.current) {
        wrapperRef.current.removeEventListener("scroll", scrollHandler);
      }
    }
  }, [chatData]);

  // Scrollear al bottom al enviar/recibir un nuevo mensaje
  // Escuchar evento de mensaje editado
  useEffect(() => {
    socket.on("newMessage", (newMessage) => {
      // Si el scroll es menor o igual a 300px, scrollear al bottom
      if (scrollFromBottom <= 300 && params.chatId === newMessage.message.chat) {
        setTimeout(() => {
          wrapperRef.current!.scrollTop = wrapperRef.current!.scrollHeight;          
        }, 100);
      }
    });

    socket.on("editedMessage", (editedMessage) => {
      updateMsgDataCache({
        queryClient,
        messageData: editedMessage
      })
    });
  }, [socket, params.chatId, scrollFromBottom]);

  return null;
}

export default useInboxHooks;