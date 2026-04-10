import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";
import type { ChatType } from "@/types/global";
import { errorMessage } from "@/utils/errorMessage";

/** Hook para eliminar un grupo */
const useDeleteGroup = (groupData: ChatType | null | undefined) => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!groupData) return;

      const token = await getToken();

      const {data} = await axiosInstance<{data: ChatType}>({
        method: "DELETE",
        url: `/chats/group/${groupData._id}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});

      navigate("/messages?type=all", {replace: true});

      toast.success("Grupo eliminado con éxito");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    }
  });

  return {mutate, isPending};
}

export default useDeleteGroup;