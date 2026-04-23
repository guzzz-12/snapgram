import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";
import { axiosInstance } from "@/utils/axiosInstance";

type Props = {
  selectedImage: File;
  onSuccess: () => void;
}

/** Actualizar la imagen de portada del usuario */
const useUpdateCoverPicture = (props: Props) => {
  const {selectedImage, onSuccess} = props;

  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("coverPicture", selectedImage);
  
      const {data} = await axiosInstance<{data: UserType}>({
        method: "POST",
        url: "/users/cover-picture",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
  
      return data.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({queryKey: ["user", data.clerkId]});
      onSuccess();
      // toast.success("Portada actualizada correctamente");
      // setSelectedImageFile([]);
      // setSelectedImagePreview([]);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {
    updateCoverMutation: mutate,
    isPendingUpdateCover: isPending
  };
}

export default useUpdateCoverPicture;