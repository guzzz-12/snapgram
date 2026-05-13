import { useReverification } from "@clerk/clerk-react";
import { useAuthContext } from "@/providers/AuthProvider";

/**
 * Eliminar permanentemente la cuenta del usuario en Clerk,
 * su documento y todos sus datos de la base de datos.
*/
const useDeleteUserAccount = () => {
  const {getToken} = useAuthContext();
  
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  
  const deleteUserAccount = useReverification(async () => {
    const token = await getToken();

    return fetch(`${serverUrl}/api/users/delete-account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  });

  return {deleteUserAccount};
}

export default useDeleteUserAccount;