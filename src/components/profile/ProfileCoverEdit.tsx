import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { toast } from "sonner";
import DeleteModal from "./DeleteModal";
import { Button } from "../ui/button";
import { useDeleteCoverPicture, useUpdateCoverPicture } from "@/services/user";
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

  const onSuccess = () => {
    toast.success("Imagen de portada actualizada correctamente");
    setSelectedImageFile([]);
    setSelectedImagePreview([]); 
  }

  const { updateCoverMutation, isPendingUpdateCover } = useUpdateCoverPicture({
    selectedImage: selectedImageFile[0],
    onSuccess
  });

  const {deleteCoverMutation, isPendingDeleteCover} = useDeleteCoverPicture({
    onSuccess: () => {
      toast.success("Foto de portada eliminada");
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    }
  });

  const isSubmitting = isPendingUpdateCover || isPendingDeleteCover;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <DeleteModal
        isOpen={openDeleteModal}
        isLoading={isPendingDeleteCover}
        title="¿Eliminar foto de portada?"
        setIsOpen={setOpenDeleteModal}
        onDelete={() => deleteCoverMutation()}
      />

      <p className="w-full text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="relative w-full h-[270px] bg-gray-300 rounded-md overflow-hidden">
        <div className="absolute bottom-0 left-0 flex justify-end items-end w-full h-[50%] bg-linear-to-t from-black to-transparent">
          <div className="flex flex-col min-[550px]:flex-row justify-center items-center gap-2 w-max pb-2 pr-2">
            {!selectedImageFile[0] &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => coverPicInputRef.current?.click()}
              >
                <Pencil className="size-4" aria-hidden />
                <span>Cambiar</span>
              </Button>
            }

            {selectedImageFile[0] &&
              <Button
                className="text-white hover:text-white border-none bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => updateCoverMutation()}
              >
                <Save className="size-4" aria-hidden />
                <span>Guardar</span>
              </Button>
            }

            {!selectedImageFile[0] &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                disabled={!userData.coverPicture || isSubmitting}
                onClick={() => deleteCoverMutation()}
              >
                <Trash2Icon className="size-4 text-destructive" aria-hidden />
                <span>Eliminar</span>
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
            userData.coverPicture ||
            "/placeholder_image.webp"
          }
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

export default ProfileCoverEdit