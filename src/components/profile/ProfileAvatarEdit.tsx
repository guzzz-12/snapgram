import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { toast } from "sonner";
import DeleteAvatarModal from "./DeleteModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDeleteAvatar, useUpdateAvatar } from "@/services/user";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { UserType } from "@/types/global";

interface Props {
  title: string;
  userData: UserType;
  selectedImageFile: File[];
  selectedImagePreview: string[];
  setSelectedImageFile: Dispatch<SetStateAction<File[]>>;
  setSelectedImagePreview: Dispatch<SetStateAction<string[]>>;
  profilePicInputRef: RefObject<HTMLInputElement | null>;
}

const ProfileAvatarEdit = (props: Props) => {
  const {title, userData, selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, profilePicInputRef } = props;

  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {setUser} = useCurrentUser();

  const onUpdateSuccessHandler = (data: UserType) => {
    toast.success("Avatar actualizado con éxito");
    setUser(data);
    setSelectedImageFile([]);
    setSelectedImagePreview([]);
  }

  const {updateAvatarMutation, isUpdateAvatarPending} = useUpdateAvatar({
    userData,
    selectedImages: selectedImageFile,
    onSuccess: onUpdateSuccessHandler
  });

  const {deleteAvatarMutation, isDeleteAvatarPending} = useDeleteAvatar({
    onSuccess: (data: UserType) => {
      toast.success("Avatar eliminado con éxito");
      setUser(data);
      setOpenDeleteModal(false);
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    }
  });

  const isSubmitting = isUpdateAvatarPending || isDeleteAvatarPending;

  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <DeleteAvatarModal
        isOpen={openDeleteModal}
        isLoading={isDeleteAvatarPending}
        title="¿Eliminar foto de perfil?"
        setIsOpen={setOpenDeleteModal}
        onDelete={() => deleteAvatarMutation()}
      />
      
      <p className="text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="flex justify-between items-center gap-2 w-full p-4 shrink-0 bg-slate-200 rounded-lg">
        <Avatar className="w-[120px] h-[120px] shrink-0 outline-2 outline-[#4F39F6]">
          <AvatarImage
            className="w-full h-full object-cover"
            src={
              selectedImagePreview[0] ||
              userData.profilePicture ||
              "/default_avatar.webp"
            }
          />
          <AvatarFallback className="w-full h-full object-cover">
            {userData.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col min-[550px]:flex-row justify-center items-center gap-2 w-max">
          {!selectedImageFile[0] &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              onClick={() => {
                profilePicInputRef.current?.click();
              }}
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
              onClick={() => updateAvatarMutation()}
            >
              <Save className="size-4" aria-hidden />
              <span>Guardar</span>
            </Button>
          }

          {!selectedImageFile[0] &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              disabled={!userData.profilePicture || isSubmitting}
              onClick={() => setOpenDeleteModal(true)}
            >
              <Trash2Icon className="size-4 text-destructive" aria-hidden />
              <span>Eliminar</span>
            </Button>
          }

          {selectedImageFile[0] &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              disabled={isSubmitting}
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
    </div>
  )
}

export default ProfileAvatarEdit