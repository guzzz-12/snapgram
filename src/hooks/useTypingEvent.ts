import { useCallback, useRef } from "react";
import type { TypingEventData } from "@/types/socketTypes";
import { socket } from "@/utils/socket";

/** Función para emitir el evento de typing */
const useTypingEvent = () => {
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Función debounced para emitir el evento de typing
  const emitTypingDebounced = useCallback((payload: TypingEventData) => {
    // Reiniciar el timer de typing si existe
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Reiniciar el timer de stoppedTyping si existe
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
    }

    // Emitir el evento de typing
    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing", payload);
      
      // Emitir el evento de stoppedTyping
      stopTypingTimerRef.current = setTimeout(() => {
        socket.emit("stoppedTyping", {
          chatId: payload.chatId,
          userId: payload.user._id
        });
      }, 1000);

    }, 250);
  }, [socket]);

  return { emitTypingDebounced };
}

export default useTypingEvent