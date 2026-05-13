import { Navigate } from "react-router";
import type { ReactNode } from "react";
import { useAuthContext } from "@/providers/AuthProvider";

interface Props {
  children: ReactNode;
}

const NoAuthRoute = ({children}: Props) => {
  const {isSignedIn, isLoaded} = useAuthContext();

  if (!isLoaded) {
    return null;
  }

  if (isLoaded && isSignedIn) {
    return <Navigate to="/" replace />
  }

  return children;
}

export default NoAuthRoute