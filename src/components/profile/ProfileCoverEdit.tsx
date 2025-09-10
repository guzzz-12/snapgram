import type { Dispatch, RefObject, SetStateAction } from "react";
import { Pencil, Save, Trash2Icon, X } from "lucide-react";
import { Button } from "../ui/button";
import type { UserType } from "@/dummy-data";

interface Props {
  title: string;
  userData: UserType;
  selectedImageFile: File | null;
  selectedImagePreview: string | null;
  setSelectedImageFile: Dispatch<SetStateAction<File | null>>;
  setSelectedImagePreview: Dispatch<SetStateAction<string | null>>;
  setUserData: Dispatch<SetStateAction<UserType>>;
  coverPicInputRef: RefObject<HTMLInputElement | null>;
}

const ProfileCoverEdit = ({title, userData, setUserData, selectedImageFile, selectedImagePreview, setSelectedImageFile, setSelectedImagePreview, coverPicInputRef }: Props) => {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <p className="w-full text-left text-neutral-900 font-medium">
        {title}
      </p>

      <div className="relative w-full h-[270px] bg-gray-300 rounded-md overflow-hidden">
        <div className="absolute bottom-0 left-0 flex justify-end items-end w-full h-[50%] bg-linear-to-t from-black to-transparent">
          <div className="flex justify-center items-center gap-2 w-max pb-2 pr-2">
            {!selectedImageFile &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                onClick={() => {
                  coverPicInputRef.current?.click();
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
                onClick={() => {}}
              >
                <Save className="size-4" aria-hidden />
                <span>Guardar</span>
              </Button>
            }

            {!selectedImageFile &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
                disabled={!userData.cover_photo}
                onClick={() => {
                  setUserData(prev => ({ ...prev, cover_photo: "" }));
                }}
              >
                <Trash2Icon className="size-4 text-destructive" aria-hidden />
                <span>Eliminar foto</span>
              </Button>
            }

            {selectedImageFile &&
              <Button
                className="border-none cursor-pointer"
                variant="outline"
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

        <img
          src={
            selectedImagePreview ||
            userData.cover_photo ||
            "/placeholder_image.webp"
          }
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

export default ProfileCoverEdit