import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useCreatePublicationModal } from "@/hooks/useCreatePublicationModal";
import { createStoryFn } from "@/repositories/storiesRepository";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  storyTextContent: string;
  selectedImageFiles: File[];
  selectdBgColor: { name: string, value: string };
  storyTextColor: "#fff" | "#000";
  storyTextBgColor: "transparent" | "#fff" | "#000";
  imageSize: "cover" | "contain";
}

/** Hook para crear una historia */
const useCreateStory = (props: Props) => {
  const queryClient = useQueryClient();

  const {setOpen} = useCreatePublicationModal();

  const {mutate, isPending} = useMutation({
    mutationFn: () => createStoryFn(props),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["stories"]});
      setOpen({open: false, publicationType: null});
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {
    createStory: mutate,
    isLoading: isPending
  };
}

export default useCreateStory;