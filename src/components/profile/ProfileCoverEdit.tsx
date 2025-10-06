import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { toast } from "sonner";
import DeleteModal from "./DeleteModal";
import { Button } from "../ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

interface Props {
  title: string;
  userData: UserType;
  selectedImageFile: File[];
  selectedImagePreview: string[];
  setSelectedImageFile: Dispatch<SetStateAction<File[]>>;
  setSelectedImagePreview: Dispatch<SetStateAction<string[]>>;
  coverPicInputRef: RefObject<HTMLInputElement | null>;
}

const ProfileCoverEdit = ({title, userData, selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, coverPicInputRef }: Props) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const onUploadCoverPicHandler = async () => {
    const token = await getToken();

    const formData = new FormData();
    formData.append("coverPicture", selectedImageFile[0]);

    const {data} = await axiosInstance<{data: UserType}>({
      method: "POST",
      url: "/users/cover-picture",
      data: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });

    return data.data;
  }

  const updateCoverMutation = useMutation({
    mutationFn: onUploadCoverPicHandler,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", data.clerkId]});
      toast.success("Imagen de portada actualizada correctamente");
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const onDeleteCoverPicHandler = async () => {
    const {data} = await axiosInstance<{data: UserType}>({
      method: "DELETE",
      url: "/users/cover-picture"
    });

    return data.data;
  }

  const deleteCoverMutation = useMutation({
    mutationFn: onDeleteCoverPicHandler,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", data.clerkId]})
      toast.success("Foto de portada eliminada con éxito");
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const isSubmitting = updateCoverMutation.isPending || deleteCoverMutation.isPending;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <DeleteModal
        isOpen={openDeleteModal}
        isLoading={deleteCoverMutation.isPending}
        title="¿Eliminar foto de portada?"
        setIsOpen={setOpenDeleteModal}
        onDelete={() => deleteCoverMutation.mutate()}
      />

      <p className="w-full text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="relative w-full h-[270px] bg-gray-300 rounded-md overflow-hidden">
        <div className="absolute bottom-0 left-0 flex justify-end items-end w-full h-[50%] bg-linear-to-t from-black to-transparent">
          <div className="flex justify-center items-center gap-2 w-max pb-2 pr-2">
            {!selectedImageFile[0] &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => coverPicInputRef.current?.click()}
              >
                <Pencil className="size-4" aria-hidden />
                <span>Cambiar foto</span>
              </Button>
            }

            {selectedImageFile[0] &&
              <Button
                className="text-white hover:text-white border-none bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => updateCoverMutation.mutate()}
              >
                <Save className="size-4" aria-hidden />
                <span>Guardar</span>
              </Button>
            }

            {!selectedImageFile[0] &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                disabled={!userData.coverPhoto || isSubmitting}
                onClick={() => deleteCoverMutation.mutate()}
              >
                <Trash2Icon className="size-4 text-destructive" aria-hidden />
                <span>Eliminar foto</span>
              </Button>
            }

            {selectedImageFile[0] &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                onClick={() => {
                  setSelectedImageFile([]);
                  setSelectedImagePreview([]);
                }}
              >
                <X className="size-4 text-destructive" aria-hidden />
                <span>Cancelar</span>
              </Button>
            }
          </div>
        </div>

        <img
          src={
            selectedImagePreview[0] ||
            userData.coverPhoto ||
            "/placeholder_image.webp"
          }
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

export default ProfileCoverEdit