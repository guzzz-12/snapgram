import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { useCurrentUser } from "./useCurrentUser";
import { socket } from "@/utils/socket";

/** Hook para manejar la grabación de mensajes de audio */
export const useAudioRecording = () => {
  const { chatId } = useParams();

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isCancelledRef = useRef(false);
  const isRecordingRef = useRef(false);
  const chatContextRef = useRef({ chatId, user: useCurrentUser.getState().user });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);

  const { user } = useCurrentUser();

  chatContextRef.current = { chatId, user };

  const stopStreamTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const emitStoppedRecording = useCallback(() => {
    const { chatId: activeChatId, user: activeUser } = chatContextRef.current;
    if (activeChatId && activeUser) {
      socket.emit("stoppedRecordingAudio", { chatId: activeChatId, user: activeUser });
    }
  }, []);

  // Limpieza al desmontar el componente
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isCancelledRef.current = true;

      const wasRecording =
        isRecordingRef.current ||
        (mediaRecorder.current !== null && mediaRecorder.current.state !== "inactive");

      if (mediaRecorder.current) {
        mediaRecorder.current.onstart = null;
        mediaRecorder.current.ondataavailable = null;
        mediaRecorder.current.onstop = null;
        mediaRecorder.current.onerror = null;

        if (mediaRecorder.current.state !== "inactive") {
          mediaRecorder.current.stop();
        }
        mediaRecorder.current = null;
      }

      stopStreamTracks();
      isRecordingRef.current = false;

      if (wasRecording) {
        emitStoppedRecording();
      }
    };
  }, [stopStreamTracks, emitStoppedRecording]);

  // Inicializar el timer al comenzar a grabar el audio
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  /** Iniciar la grabación de una nota de voz */
  const startRecording = useCallback(async () => {
    if (isStartingRef.current || isRecordingRef.current) {
      return;
    }

    isStartingRef.current = true;
    isCancelledRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("MediaDevices API no disponible");
      }

      // Generar el stream de audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          sampleRate: {
            ideal: 48000,
          },
          sampleSize: {
            ideal: 16,
          },
        },
      });

      // Si el componente se desmontó mientras se esperaba el permiso, liberar el micrófono
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Crear el recorder y registrar handlers ANTES de invocar start()
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;

      const audioChunks: Blob[] = [];

      recorder.onstart = () => {
        if (!isMountedRef.current) return;

        isRecordingRef.current = true;
        setTimer(0);
        setAudioFile(null);
        setIsRecording(true);

        if (chatId && user) {
          socket.emit("recordingAudio", { chatId, user });
        }
      };

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        isRecordingRef.current = false;
        stopStreamTracks();
        mediaRecorder.current = null;

        if (isMountedRef.current) {
          setIsRecording(false);

          if (!isCancelledRef.current) {
            const fileName = `${Date.now()}-${uuid()}.webm`;
            const file = new File(audioChunks, fileName, {
              type: "audio/webm;codecs=opus",
            });
            setAudioFile(file);
          }
        }

        if (chatId && user) {
          socket.emit("stoppedRecordingAudio", { chatId, user });
        }
      };

      recorder.onerror = () => {
        isRecordingRef.current = false;
        stopStreamTracks();
        mediaRecorder.current = null;

        if (isMountedRef.current) {
          toast.error("Error durante la grabación de audio.");
          setTimer(0);
          setIsRecording(false);
        }

        if (chatId && user) {
          socket.emit("stoppedRecordingAudio", { chatId, user });
        }
      };

      // Iniciar la grabación de la nota de voz
      recorder.start();
    } catch (error: unknown) {
      isRecordingRef.current = false;
      stopStreamTracks();
      mediaRecorder.current = null;

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Permiso denegado para grabar audio.");
      } else if (error instanceof DOMException && error.name === "NotReadableError") {
        toast.error("Micrófono no disponible o desconectado.");
      } else {
        toast.error("Error iniciando la grabación de audio.");
      }

      if (isMountedRef.current) {
        setTimer(0);
        setIsRecording(false);
      }

      if (chatId && user) {
        socket.emit("stoppedRecordingAudio", { chatId, user });
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [chatId, user, stopStreamTracks]);

  /** Limpiar el audio grabado y liberar recursos activos si se estaba grabando */
  const clearRecording = useCallback(() => {
    isCancelledRef.current = true;
    isRecordingRef.current = false;

    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }

    stopStreamTracks();
    setIsRecording(false);
    setAudioFile(null);
    setTimer(0);
  }, [stopStreamTracks]);

  /** Detener la grabación del audio */
  const stopRecording = useCallback(() => {
    isCancelledRef.current = false;
    isRecordingRef.current = false;

    stopStreamTracks();

    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }

    setIsRecording(false);
  }, [stopStreamTracks]);

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
    clearRecording,
  };
};
