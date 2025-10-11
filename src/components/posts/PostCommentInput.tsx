import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import EmojiPicker from "emoji-picker-react";
import { Image, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import useImagePicker from "@/hooks/useImagePicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import type { Comment } from "@/types/global";

const PostCommentInput = ({postId}: {postId: string}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [commentText, setCommentText] = useState("");

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      const formData = new FormData();

      if (commentText) {
        formData.append("content", commentText);
      }

      selectedImageFiles.forEach(file => formData.append("media", file));

      if (!commentText && selectedImageFiles.length === 0) return;

      return await axiosInstance<{data: Comment}>({
        method: "POST",
        url: `/comments/posts/${postId}`,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

    },
    onSuccess: () => {
      setCommentText("");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      queryClient.invalidateQueries({queryKey: ["postComments", postId]});
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    },
  });

  useEffect(() => {
    return () => {
      setCommentText("");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      if(fileInputRef.current) {
        fileInputRef.current.value = ""
      };
    }
  }, []);

  return (
    <div className="relative flex justify-between items-center gap-3 w-full shrink-0 px-6 py-4 bg-white">
      {selectedImagePreviews.length > 0 &&
        <div className="absolute -top-1 right-1 p-1.5 -translate-x-[100%] -translate-y-[100%] bg-neutral-300 rounded-sm shadow overflow-hidden">
          <button
            className="absolute top-1 right-1 p-0.5 rounded-full bg-red-50 cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none"
            disabled={isPending}
            onClick={() => {
              setSelectedImageFiles([]);
              setSelectedImagePreviews([]);
            }}
          >
            <X className="text-destructive" aria-hidden />
            <span className="sr-only">Eliminar imagen</span>
          </button>

          <img
            src={selectedImagePreviews[0]}
            className="w-[80px] h-[80px] object-cover"
          />
        </div>
      }

      <div className="relative w-full border rounded-sm overflow-hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 cursor-pointer"
              disabled={isPending}
            >
              <Smile className="text-neutral-600" aria-hidden />
              <span className="sr-only">Seleccionar Emoji</span>
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0 -translate-y-[1rem] bg-transparent">
            <EmojiPicker
              searchDisabled
              onEmojiClick={(e) => setCommentText((prev) => prev + e.emoji)}
            />
          </PopoverContent>
        </Popover>

        <Textarea
          className="w-full min-h-auto max-h-[150px] pl-12 py-4 bg-slate-100 border-none rounded-sm resize-none scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-white"
          placeholder="Escribe un comentario..."
          disabled={isPending}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
      </div>

      {!selectedImageFiles[0] &&
        <div className="flex justify-between items-center gap-3">
          <button
            className="cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="text-neutral-600" aria-hidden />
            <span className="sr-only">Seleccionar imagen</span>
          </button>
        </div>
      }

      {(commentText.length > 0 || selectedImageFiles[0]) &&
        <button
          className="p-1 text-sm text-blue-700 font-semibold cursor-pointer hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:pointer-events-none"
          disabled={isPending}
          onClick={() => mutate()}
        >
          Enviar
        </button>
      }

      {/* Input oculto del selector de imagen */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple={false}
          disabled={isPending}
          accept="image/png, image/jpg, image/jpeg, image/webp"
          onChange={onImagePickHandler}
        />
    </div>
  )
}

export default PostCommentInput