import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { toast } from "sonner";
import DeleteAvatarModal from "./DeleteModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { axiosInstance } from "@/utils/axiosInstance";
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

const ProfileAvatarEdit = ({title, userData, selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, profilePicInputRef }: Props) => {
  const {userClerkId} = useParams<{userClerkId: string}>();

  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  const {setUser} = useCurrentUser();

  const onSubmitHandler = async () => {
    if (!selectedImageFile[0]) return;

    const token = await getToken();

    const formData = new FormData();

    formData.append("avatar", selectedImageFile[0]);

    const {data} = await axiosInstance<{data: UserType}>({
      method: "POST",
      url: "/users/user-avatar",
      data: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });

    return data.data;
  }

  const updateAvatarMutation = useMutation({
    mutationFn: onSubmitHandler,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", userClerkId]});
      setUser(data!);
      toast.success("Avatar actualizado con éxito");
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const onDeleteAvatarHandler = async () => {
    const token = await getToken();

    const {data} = await axiosInstance<{data: UserType}>({
      method: "DELETE",
      url: "/users/user-avatar",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data.data;
  }

  const deleteAvatarMutation = useMutation({
    mutationFn: onDeleteAvatarHandler,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", userClerkId]});
      setUser(data);
      toast.success("Avatar eliminado con éxito");
      setOpenDeleteModal(false);
      setSelectedImageFile([]);
      setSelectedImagePreview([]);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const isSubmitting = updateAvatarMutation.isPending || deleteAvatarMutation.isPending;

  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <DeleteAvatarModal
        isOpen={openDeleteModal}
        isLoading={deleteAvatarMutation.isPending}
        title="¿Eliminar foto de perfil?"
        setIsOpen={setOpenDeleteModal}
        onDelete={() => deleteAvatarMutation.mutate()}
      />
      
      <p className="text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="flex justify-between items-center w-full p-4 shrink-0 bg-slate-200 rounded-lg">
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

        <div className="flex justify-center items-center gap-2 w-max">
          {!selectedImageFile[0] &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              onClick={() => {
                profilePicInputRef.current?.click();
              }}
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
              onClick={() => updateAvatarMutation.mutate()}
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
              <span>Eliminar foto</span>
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