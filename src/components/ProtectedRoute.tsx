import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuthContext } from "@/providers/AuthProvider";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({children}: Props) => {
  const {isSignedIn, isLoaded} = useAuthContext();

  if (!isLoaded) {
    return null;
  }

  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return children;
}

export default ProtectedRoute