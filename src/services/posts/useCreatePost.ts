import type { RefObject } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPostFn } from "@/repositories/postsRepository";
import type { UserType } from "@/types/global";

type CreatePostProps = {
  user: UserType | null;
  searchTerm: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textContent: string;
  selectedImageFiles: File[];
  onSuccess?: () => void;
  onError: (error: Error, type: "create" | "share") => void;
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
    onError: (error, vars) => {
      vars.onError(error, "create")
    }
  });

  return {
    mutate,
    isPending
  }
}

export default useCreatePost;