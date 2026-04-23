import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  selectedHashtag: string;
  currentlyTypingHashtag: string;
  onSuccess: () => void;
}

const useCreateHashtag = (props: Props) => {
  const {selectedHashtag, currentlyTypingHashtag, onSuccess} = props;

  const queryClient = useQueryClient();

  const {mutate: createHashtag, isPending} = useMutation({
    mutationFn: async () => {
      return axiosInstance( {
        method: "POST",
        url: "/hashtags",
        data: {
          title: selectedHashtag || currentlyTypingHashtag
        },
        headers: {
          "Content-Type": "application/json",
        }
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["hashtags"]});
      onSuccess();
      // setOpenPopover(false);
    },
    onError: (err) => {
      toast.error(errorMessage(err));
    },
    retry: 2
  });

  return {
    createHashtag,
    isPending
  }
}

export default useCreateHashtag;