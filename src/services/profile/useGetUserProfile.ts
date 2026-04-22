import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/repositories/profileRepository";

/** Hook para consultar el perfil de un usuario */
const useGetUserProfile = (
  userClerkId: string | undefined,
  fetchOnHover?: boolean,
  isHovered?: boolean
) => {
  const userProfileData = useQuery({
    queryKey: ["user", userClerkId],
    queryFn: async () => fetchUserProfile({userClerkId}),
    enabled: fetchOnHover ? (isHovered && !!userClerkId) : !!userClerkId,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const {data: userData, isLoading: loadingUser, error: userError} = userProfileData;

  return {userData, loadingUser, userError};
}

export default useGetUserProfile;