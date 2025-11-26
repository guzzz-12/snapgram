import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { UserType } from "@/types/global";

interface Props {
  isOpen: boolean;
}

/** Función para consultar los usuarios que pueden ser agregados al chat */
export const getUsersList = ({ isOpen }: Props) => {
  const { getToken } = useAuth();

  // Función para consultar los usuarios que pueden ser agregados al chat
  const getUsers = async (page: number) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: UserType[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/chats/get-users-to-chat",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5
      }
    });

    return data;
  }

  // Consultar la lista de usuarios para crear el grupo
  const {data: users, error: usersError, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["get-users-list"],
    initialPageParam: 1,
    queryFn: ({pageParam}) => getUsers(pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
    refetchOnWindowFocus: false,
    enabled: isOpen
  });

  return {users, usersError, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage};
}