import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useUser } from "@clerk/clerk-react";

interface Props {
  children: ReactNode;
}

const ProtectedRoute = ({children}: Props) => {
  const {isSignedIn, isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return children;
}

export default ProtectedRoute