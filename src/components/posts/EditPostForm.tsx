import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "react-router";
import CreatePostInput from "./CreatePostInput";
import { Button } from "@/components/ui/button";
import { usePostsService } from "@/services/postsService";
import type { PostWithLikes } from "@/types/global";

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

  const {editPost} = usePostsService();

  // Mutation para editar el post
  const {mutate, isPending} = editPost();

  const onSaveChangesHandler = () => {
    mutate({
      postData,
      updatedTextContent: textContent,
      searchTerm,
      onSuccess: () => {
        setIsEditingPost(false);
      }
    });
  }

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
          onClick={onSaveChangesHandler}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

export default EditPostForm