import type { RefObject } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPostFn } from "@/repositories/postsRepository";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

type CreatePostProps = {
  user: UserType | null;
  searchTerm: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textContent: string;
  selectedImageFiles: File[];
  onSuccess?: () => void;
}

/** Hook para crear un post */
const useCreatePost = () => {
  const queryClient = useQueryClient();

  const {mutate, isPending} = useMutation({
    mutationFn: async (props: CreatePostProps) => createPostFn({
      user: props.user,
      textContent: props.textContent,
      selectedImageFiles: props.selectedImageFiles,
    }),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      if (vars.searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", vars.searchTerm, "posts"]});
      }

      vars.onSuccess?.();
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useCreatePost;