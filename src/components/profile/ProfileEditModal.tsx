import { useRef, useState } from "react";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ProfileAvatarEdit from "./ProfileAvatarEdit";
import ProfileCoverEdit from "./ProfileCoverEdit";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogOverlay } from "../ui/dialog";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import useImagePicker from "@/hooks/useImagePicker";
import type { UserType } from "@/types/global";

const FormSchema = z.object({
  fullName: z.string().max(50, "El nombre no puede tener más de 50 caracteres"),
  username: z.string().max(50, "El nombre de usuario no puede tener más de 50 caracteres"),
  bio: z.string().max(4200, "La biografía no puede tener más de 4200 caracteres").optional(),
});

type FormType = z.infer<typeof FormSchema>;

interface Props {
  userData: UserType;
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
}

const ProfileEditModal = ({ userData, isOpen, onClose }: Props) => {
  const profilePicInputRef = useRef<HTMLInputElement | null>(null);
  const coverPicInputRef = useRef<HTMLInputElement | null>(null);

  const [mutableUserData, setMutableUserData] = useState<UserType>(userData);

  const {getToken, userId} = useAuth();
  const queryClient = useQueryClient();

  const formProps = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fullName: mutableUserData.fullName,
      username: mutableUserData.username,
      bio: mutableUserData.bio,
    },
  });
  
  const {selectedImageFiles: selectedProfilePicFile, selectedImagePreviews: selectedProfilePicPreview, setSelectedImagePreviews: setSelectedProfilePicPreview, onImagePickHandler: onProfilePicPickHandler, setSelectedImageFiles: setSelectedProfilePicFile} = useImagePicker({
    fileInputRef: profilePicInputRef
  });

  const {selectedImageFiles: selectedCoverPicFile, selectedImagePreviews: selectedCoverPicPreview, setSelectedImageFiles: setSelectedCoverPicFile, setSelectedImagePreviews: setSelectedCoverPicPreview, onImagePickHandler: onCoverPicPickHandler} = useImagePicker({
    fileInputRef: coverPicInputRef
  });

  const updateUserMutation = useMutation({
    mutationFn: async (values: FormType) => {
      const token = await getToken();

      const {data} = await axiosInstance({
        method: "PUT",
        url: `/users/update-user`,
        data: values,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ["user", userId]}),
        queryClient.invalidateQueries({queryKey: ["posts", userId]}),      
      ]);

      onClose(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  const onSubmitHandler = (values: FormType) => {
    updateUserMutation.mutate(values);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={isOpen => {
        if (updateUserMutation.isPending) return;
        onClose(isOpen);
      }}
    >
      <DialogOverlay className="bg-black opacity-70" />

      <DialogContent className="w-full !max-w-[90vw] min-[750px]:!max-w-[80vw] min-[900px]:!max-w-[70vw] min-[1100px]:!max-w-[800px] h-[90vh] pb-6 rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <DialogHeader className="w-full bg-white">
          <h2 className="text-xl text-left text-neutral-900 font-bold">
            Editar perfil
          </h2>
        </DialogHeader>

        <Separator className="w-full" />

        <div className="flex flex-col gap-6 w-full h-full">
          <ProfileAvatarEdit
            title="Foto de perfil"
            userData={mutableUserData}
            selectedImageFile={selectedProfilePicFile}
            selectedImagePreview={selectedProfilePicPreview}
            setSelectedImageFile={setSelectedProfilePicFile}
            setSelectedImagePreview={setSelectedProfilePicPreview}
            profilePicInputRef={profilePicInputRef}
          />

          <ProfileCoverEdit
            title="Foto de portada"
            userData={mutableUserData}
            selectedImageFile={selectedCoverPicFile}
            selectedImagePreview={selectedCoverPicPreview}
            setSelectedImageFile={setSelectedCoverPicFile}
            setSelectedImagePreview={setSelectedCoverPicPreview}
            coverPicInputRef={coverPicInputRef}
          />

          <Form {...formProps}>
            <form 
              className="flex flex-col gap-5 w-full"
              onSubmit={formProps.handleSubmit(onSubmitHandler)}
            >
              <FormField
                name="fullName"
                control={formProps.control}
                render={({field: fieldProps}) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-base">
                        Tu nombre
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tu nombre completo"
                          disabled={updateUserMutation.isPending}
                          {...fieldProps}
                        />
                      </FormControl>
                      
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )
                }}
              />

              <FormField
                name="username"
                control={formProps.control}
                render={({field: fieldProps}) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-base">
                        Tu nombre de usuario
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john_snow"
                          disabled={updateUserMutation.isPending}
                          {...fieldProps}
                        />
                      </FormControl>
                      
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )
                }}
              />

              <FormField
                name="bio"
                control={formProps.control}
                render={({field: fieldProps}) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-base">
                        Escribe algo sobre ti
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-none"
                          placeholder="Escribe algo sobre ti..."
                          rows={4}
                          disabled={updateUserMutation.isPending}
                          {...fieldProps}
                        />
                      </FormControl>
                      
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )
                }}
              />

              <div className="flex justify-end items-center gap-2">
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  type="button"
                  disabled={updateUserMutation.isPending}
                  onClick={() => onClose(false)}
                >
                  Cancelar
                </Button>

                <Button
                  className="bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer"
                  type="submit"
                  form="profile-edit-form"
                  disabled={updateUserMutation.isPending}
                  onClick={() => formProps.handleSubmit(onSubmitHandler)()}
                >
                  Guardar
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Input oculto del selector del avatar */}
        <input
          ref={profilePicInputRef}
          type="file"
          hidden
          multiple={false}
          disabled={updateUserMutation.isPending}
          accept="image/png, image/jpg, image/jpeg, image/webp"
          onChange={onProfilePicPickHandler}
        />

        {/* Input oculto del selector del la imagen de portada */}
        <input
          ref={coverPicInputRef}
          type="file"
          hidden
          multiple={false}
          disabled={updateUserMutation.isPending}
          accept="image/png, image/jpg, image/jpeg, image/webp"
          onChange={onCoverPicPickHandler}
        />
      </DialogContent>
    </Dialog>
  )
}

export default ProfileEditModal