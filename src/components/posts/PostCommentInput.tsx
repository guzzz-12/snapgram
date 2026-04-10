import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { Image, X } from "lucide-react";
import CreateCommentInput from "@/components/comments/CreateCommentInput";
import { useCreateComment } from "@/services/comments";
import useImagePicker from "@/hooks/useImagePicker";
import { cn } from "@/lib/utils";

interface Props {
  postId: string;
  className?: HTMLAttributes<HTMLElement>["className"];
}

const PostCommentInput = ({postId, className}: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [commentText, setCommentText] = useState("");

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({fileInputRef});

  const {createCommentMutation, isCreatingComment: isPending} = useCreateComment();

  const onCreateCommentHandler = () => {
    const formData = new FormData();

    if (commentText) {
      formData.append("content", commentText);
    }

    selectedImageFiles.forEach(file => formData.append("media", file));

    if (!commentText && selectedImageFiles.length === 0) return;

    createCommentMutation({
      postId,
      formData,
      onSuccess: () => {
        setCommentText("");
        setSelectedImageFiles([]);
        setSelectedImagePreviews([]);
      }
    });
  }

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
    <div className={cn("relative flex justify-between items-center gap-3 w-full shrink-0 px-3 py-2 bg-neutral-100 border-t", className)}>
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
          onClick={onCreateCommentHandler}
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