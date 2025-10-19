import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Image, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CreateCommentInput from "./CreateCommentInput";
import { errorMessage } from "@/utils/errorMessage";
import { axiosInstance } from "@/utils/axiosInstance";
import useImagePicker from "@/hooks/useImagePicker";
import type { Comment } from "@/types/global";
import { useSearchParams } from "react-router";

const PostCommentInput = ({postId}: {postId: string}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

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
    onSuccess: async () => {
      setCommentText("");
      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      await queryClient.invalidateQueries({queryKey: ["posts"]});
      await queryClient.invalidateQueries({queryKey: ["postComments", postId]});

      if (searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
      }
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
    <div className="relative flex justify-between items-center gap-3 w-full shrink-0 px-6 py-4 bg-neutral-100 border-t">
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

      <CreateCommentInput
        textContent={commentText}
        isPending={isPending}
        setTextContent={setCommentText}
      />

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