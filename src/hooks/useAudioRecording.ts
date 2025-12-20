import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { useCurrentUser } from "./useCurrentUser";
import { socket } from "@/utils/socket";

/** Hook para manejar la grabación de mensajes de audio */
export const useAudioRecording = () => {
  const {chatId} = useParams();

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);

  const {user} = useCurrentUser();

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Inicializar el timer al comenzar a grabar el audio
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRecording]);

  /** Iniciar la grabación de una nota de voz */
  const startRecording = useCallback(async () => {
    try {
      console.log("INICIANDO GRABACIÓN DEL AUDIO");
  
      // Generar el stream de audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          sampleRate: {
            ideal: 48000
          },
          sampleSize: {
            ideal: 16
          }
        },
      });
  
      streamRef.current = stream;
  
      // Crear el recorder
      mediaRecorder.current = new MediaRecorder(stream);
  
      // Iniciar la grabación de la nota de voz
      mediaRecorder.current.start();
  
      mediaRecorder.current.onstart = () => {
        setTimer(0);
        setAudioFile(null);
        setIsRecording(true);

        // Emitir el evento de grabando audio
        if (chatId && user) {
          socket.emit("recordingAudio", {chatId, user});
        }
      }
  
      const audioChunks: Blob[] = [];
  
      // Agregar los chunks de audio al array local
      mediaRecorder.current.ondataavailable = (e) => {
        // audioChunks = [...audioChunks, e.data];
        audioChunks.push(e.data);
      };
  
      // Generar el archivo temporal de audio en formato base64 y almacenar
      // la url temporal en el state local al detener la grabación
      mediaRecorder.current.onstop = (_e) => {
        console.log("GRABACIÓN FINALIZADA");
  
        const fileName = `${Date.now()}-${uuid()}.webm`;
  
        const file = new File(audioChunks, fileName, { type: "audio/webm;codecs=opus" });
  
        setAudioFile(file);

        // Emitir el evento de grabación detenida
        if (chatId && user) {
          socket.emit("stoppedRecordingAudio", {chatId, user});
        }
      };
      
    } catch (error: any) {
      console.log("ERROR INICIANDO GRABACIÓN DE AUDIO", error);

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          toast.error("Permiso denegado para grabar audio.");
          return setIsRecording(false);
        }

        if (error.name === "NotReadableError") {
          toast.error("Micrófono no disponible o desconectado.");
          return setIsRecording(false);
        }
      }

      toast.error("Error iniciando la grabación de audio.");

      setTimer(0);
      setIsRecording(false);
      streamRef.current = null;

      // Emitir el evento de grabación detenida
      if (chatId && user) {
        socket.emit("stoppedRecordingAudio", {chatId, user});
      }
    }
  }, [socket, chatId, user]);

  /** Limpiar el audio grabado */
  const clearRecording = () => {
    setAudioFile(null);
    setTimer(0);
  }

  /** Detener la grabación del audio */
  const stopRecording = useCallback(() => {
    // Detener todos los tracks del stream para apagar el micrófono físicamente
    if (mediaRecorder.current && streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => track.stop());
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  /** Formatear los segundos de la grabación a formato 00:00 */
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(timer / 60);
    const remainingSeconds = timer % 60;
    
    const mm = String(minutes).padStart(2, "0");
    const ss = String(remainingSeconds).padStart(2, "0");
    
    return `${mm}:${ss}`;
  }, [timer]);

  return {
    audioFile,
    isRecording,
    recordingTime: formattedDuration,
    recordedFile: audioFile,
    startRecording,
    stopRecording,
    clearRecording
  };
}