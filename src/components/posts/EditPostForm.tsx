import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import CreatePostInput from "./CreatePostInput";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

interface Props {
  postData: PostWithLikes;
  textContent: string;
  setTextContent: Dispatch<SetStateAction<string>>;
  setIsEditingPost: (value: boolean) => void;
}

const EditPostForm = (props: Props) => {
  const { postData, textContent, setTextContent, setIsEditingPost } = props;

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const {getToken} = useAuth();
  const queryClient = useQueryClient();

  // Mutation para editar el post
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!postData) return;

      const token = await getToken();

      return axiosInstance({
        method: "PUT",
        url: `/posts/${postData._id}`,
        data: {
          content: textContent
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["posts"]});

      if (searchTerm) {
        await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
      }

      setIsEditingPost(false);
    },
    onError: (error) => {
      const message = errorMessage(error);
      toast.error(message);
      setTextContent(postData!.content);
    }
  });

  return (
    <div className="w-full p-3 pt-0">
      <CreatePostInput
        textContent={textContent}
        isPending={isPending}
        setTextContent={setTextContent}
      />

      <div className="flex justify-end items-center gap-2 w-full py-2">
        <Button
          className="cursor-pointer"
          variant="outline"
          disabled={isPending}
          onClick={() => setIsEditingPost(false)}
        >
          Cancelar
        </Button>

        <Button
          className="bg-[#4F39F6] hover:bg-[#331fcf] cursor-pointer disabled:pointer-events-none"
          disabled={
            isPending || (textContent === postData.content)
          }
          onClick={() => mutate()}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

export default EditPostForm