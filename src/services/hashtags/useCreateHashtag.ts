import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

type Props = {
  onSuccess: (createdTitle: string) => void;
};

const useCreateHashtag = ({ onSuccess }: Props) => {
  const queryClient = useQueryClient();

  const {mutate: createHashtag, isPending} = useMutation({
    mutationFn: async (title: string) => {
      await axiosInstance({
        method: "POST",
        url: "/hashtags",
        data: {title},
        headers: {
          "Content-Type": "application/json",
        },
      });

      return title;
    },
    onSuccess: async (createdTitle) => {
      await queryClient.invalidateQueries({queryKey: ["hashtags"]});
      onSuccess(createdTitle);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
    retry: 1,
  });

  return {
    createHashtag,
    isPending,
  };
};

export default useCreateHashtag;