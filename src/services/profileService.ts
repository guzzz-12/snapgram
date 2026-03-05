import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFollowers, fetchFollowing, fetchUserLikedPosts, fetchUserPosts, fetchUserProfile } from "@/repositories/profileRepository";
import { axiosInstance } from "@/utils/axiosInstance";
import { toast } from "sonner";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

/**
 * Servicios para obtener la data del perfil de un usuario.
 * Debe ser invocado en el top level del componente.
*/
export const useProfileService = () => {
  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  return {
    /** Service para consultar el perfil de un usuario */
    getUserProfile: (userClerkId: string | undefined) => {
      const userProfileData = useQuery({
        queryKey: ["user", userClerkId],
        queryFn: async () => fetchUserProfile({userClerkId, getToken}),
        enabled: !!userClerkId,
        refetchOnWindowFocus: false,
        retry: 1
      });

      const {data: userData, isLoading: loadingUser, error: userError} = userProfileData;

      return {userData, loadingUser, userError};
    },

    /** Service para consultar los posts del usuario */
    getUserPosts: (userData: UserType | null) => {
      const postsData = useInfiniteQuery({
        queryKey: ["posts", userData?.clerkId],
        queryFn: ({pageParam}) => fetchUserPosts({page: pageParam, userId: userData?._id, getToken}),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: !!userData,
        retry: 2,
      });

      const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = postsData;

      const posts = data?.pages.flatMap((page) => page.data) ?? [];

      return {
        data: posts,
        isLoading,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        error,
        fetchNextPage,
        refetch
      }
    },

    /** Service para consultar los seguidores del usuario */
    getFollowers: (userData: UserType | null) => {
      const res = useInfiniteQuery({
        queryKey: ["followers", userData?._id],
        queryFn: async ({pageParam}) => fetchFollowers({userId: userData?._id, page: pageParam, getToken}),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: !!userData
      });

      const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const followers = data?.pages.flatMap(page => page.data) ?? [];

      return {
        data: followers,
        error,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Service para consultar los seguidos del usuario */
    getFollowing: (userData: UserType | null) => {
      const res = useInfiniteQuery({
        queryKey: ["following", userData?._id],
        queryFn: async ({pageParam}) => fetchFollowing({userId: userData?._id, page: pageParam, getToken}),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: !!userData
      });

      const {data, error, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} = res;

      const following = data?.pages.flatMap(page => page.data) ?? [];

      return {
        data: following,
        error,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
      }
    },

    /** Service para seguir o dejar de seguir a un usuario */
    followOrUnfollowUser: (followedUserId: string, currentUserClerkId: string | null | undefined) => {
      const {mutate, isPending} = useMutation({
        mutationFn: async () => {
          const token = await getToken();

          if (!currentUserClerkId) return;

          return axiosInstance({
            method: "POST",
            url: `/follows/follow-or-unfollow`,
            data: {
              userId: followedUserId
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        },
        onSuccess: async () => {
          await queryClient.invalidateQueries({queryKey: ["user", currentUserClerkId]});
          await queryClient.invalidateQueries({queryKey: ["followers"]});
          await queryClient.invalidateQueries({queryKey: ["following"]});
        },
        onError: (error) => {
          toast.error(errorMessage(error));
        }
      });

      return {mutate, isPending};
    },

    /** Service para consultar los posts gustados del usuario */
    getUserLikedPosts: (userData: UserType | null) => {
      const res = useInfiniteQuery({
        queryKey: ["likes", "likedPosts"],
        queryFn: ({pageParam}) => fetchUserLikedPosts(pageParam, getToken),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextPage : null,
        refetchOnWindowFocus: false,
        enabled: !!userData,
        retry: 2,
      });

      const {data, error, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch} = res;

      const likedPosts = data?.pages.flatMap(page => page.data) ?? [];

      return {
        data: likedPosts,
        error,
        isLoading,
        isRefetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch
      }
    }
  }
}