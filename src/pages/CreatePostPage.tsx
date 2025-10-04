import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import useImagePicker from "@/hooks/useImagePicker";
import { dummyUserData } from "@/dummy-data";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { PostType } from "@/types/global";

const CreatePostPage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [textContent, setTextContent] = useState("");

  const navigate = useNavigate();

  const {selectedImageFiles, selectedImagePreviews, setSelectedImageFiles, setSelectedImagePreviews, onImagePickHandler} = useImagePicker({ fileInputRef });

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const createPost = async () => {
    if (!textContent && !selectedImageFiles) return;

    const formData = new FormData();

    if (textContent) {
      formData.append("content", textContent);
    }

    selectedImageFiles.forEach(file => formData.append("images", file));

    const token = await getToken();

    const {data} = await axiosInstance<{data: PostType}>({
      method: "POST",
      url: "/posts",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`
      }
    });

    return data;
  }

  const {mutate, isPending} = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["posts"]});

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTextContent("");

      toast.success("Post creado con éxito.");

      setSelectedImageFiles([]);
      setSelectedImagePreviews([]);

      navigate("/");
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      
      <section className="flex flex-col gap-6 w-full h-full">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold">
            Crear Post
          </h1>

          <p className="text-sm text-neutral-700">
            Comparte lo que estás pensando
          </p>
        </div>

        <div className="w-full max-w-[600px] h-auto p-4 bg-white rounded-lg shadow">
          <div className="flex justify-start items-center gap-3 mb-6">
            <Avatar className="w-[60px] h-[60px] shrink-0">
              <AvatarImage
                src={dummyUserData.profile_picture}
                alt={dummyUserData.username}
              />

              <AvatarFallback>
                {dummyUserData.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col w-full">
              <p className="font-semibold text-neutral-900">
                {dummyUserData.full_name}
              </p>

              <p className="text-sm text-neutral-700">
                @{dummyUserData.username}
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-4 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              mutate();
            }}
          >
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <Textarea
                className="border-b border-t-0 border-l-0 border-r-0 rounded-none shadow-none resize-none placeholder:text-neutral-400"
                placeholder="¿Qué estás pensando?"
                rows={4}
                disabled={isPending}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center gap-4 w-full overflow-hidden">
              <div className="flex justify-start items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                {!selectedImagePreviews.length && (
                  <button
                    className="p-2 cursor-pointer"
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="size-10 text-neutral-600 stroke-1" aria-hidden />
                    <span className="sr-only">Adjuntar imágenes</span>
                  </button>
                )}

                {selectedImagePreviews.length > 0 && selectedImagePreviews.length < 10 && (
                  <button
                    className="p-2 cursor-pointer"
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PlusCircle className="size-10 text-neutral-600 stroke-1" aria-hidden />
                    <span className="sr-only">Adjuntar otra imagen</span>
                  </button>
                )}

                <div className="flex justify-start items-center gap-3 w-full">
                  {selectedImagePreviews.map((preview, i) => (
                    <div
                      key={i}
                      className="relative w-16 h-16 shrink-0"
                    >
                      <button
                        className="absolute top-0.5 right-0.5 flex justify-center items-center p-0.5 rounded-full cursor-pointer text-red-700 bg-red-50"
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setSelectedImageFiles(selectedImageFiles.filter((_, index) => index !== i));
                          setSelectedImagePreviews(selectedImagePreviews.filter((_, index) => index !== i));
                        }}
                      >
                        <X className="size-4" aria-hidden />
                        <span className="sr-only">Eliminar imagen</span>
                      </button>

                      <img
                        className="w-full h-full object-cover rounded-sm"
                        src={preview}
                        alt=""
                      />
                    </div>                    
                  ))}
                </div>
              </div>

              <Button
                className="gap-1 text-sm font-normal shrink-0 bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
                type="submit"
                disabled={isPending || (!textContent && !selectedImageFiles.length)}
              >
                Publicar Post
              </Button>
            </div>
          </form>

          {/* Input oculto del selector de imagen */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            disabled={isPending}
            accept="image/png, image/jpg, image/jpeg, image/webp"
            onChange={onImagePickHandler}
          />
        </div>
      </section>
    </main>
  )
}

export default CreatePostPage