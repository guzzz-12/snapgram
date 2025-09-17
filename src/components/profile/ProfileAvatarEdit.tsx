import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/dummy-data";

interface Props {
  title: string;
  userData: UserType;
  selectedImageFile: File | null;
  selectedImagePreview: string | null;
  setSelectedImageFile: Dispatch<SetStateAction<File | null>>;
  setSelectedImagePreview: Dispatch<SetStateAction<string | null>>;
  setUserData: Dispatch<SetStateAction<UserType>>;
  profilePicInputRef: RefObject<HTMLInputElement | null>;
  
}

const ProfileAvatarEdit = ({title, userData, setUserData, selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, profilePicInputRef }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitHandler = async () => {
    try {
      if (!selectedImageFile) return;

      setIsSubmitting(true);

      const formData = new FormData();

      formData.append("avatar", selectedImageFile);

      const {data} = await axiosInstance<{data: UserType}>({
        method: "POST",
        url: "/users/user-avatar",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Avatar actualizado con éxito");

      setUserData(data.data);
      setSelectedImageFile(null);
      setSelectedImagePreview(null);
      
    } catch (error: any) {
      toast.error(error.message);

    } finally {
      setIsSubmitting(false);
    }
  }

  const onDeleteAvatarHandler = async () => {
    try {
      setIsSubmitting(true);

      const {data} = await axiosInstance<{data: UserType}>({
        method: "DELETE",
        url: "/users/user-avatar"
      });

      toast.success("Avatar eliminado con éxito");

      setUserData(data.data);
      setSelectedImageFile(null);
      setSelectedImagePreview(null);
      
    } catch (error: any) {
      toast.error(error.message);

    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <p className="text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="flex justify-between items-center w-full p-4 shrink-0 bg-slate-200 rounded-lg">
        <Avatar className="w-[120px] h-[120px] outline-2 outline-[#4F39F6]">
          <AvatarImage
            className="w-full h-full object-cover object-center"
            src={
              selectedImagePreview ||
              userData.profile_picture ||
              "/default_avatar.webp"
            }
          />
          <AvatarFallback>
            {userData.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex justify-center items-center gap-2 w-max">
          {!selectedImageFile &&
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

          {selectedImageFile &&
            <Button
              className="text-white hover:text-white border-none bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
              variant="outline"
              disabled={isSubmitting}
              onClick={onSubmitHandler}
            >
              <Save className="size-4" aria-hidden />
              <span>Guardar</span>
            </Button>
          }

          {!selectedImageFile &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              disabled={!userData.profile_picture || isSubmitting}
              onClick={onDeleteAvatarHandler}
            >
              <Trash2Icon className="size-4 text-destructive" aria-hidden />
              <span>Eliminar foto</span>
            </Button>
          }

          {selectedImageFile &&
            <Button
              className="border-none cursor-pointer"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setSelectedImageFile(null);
                setSelectedImagePreview(null);
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