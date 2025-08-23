import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useUser } from "@clerk/clerk-react";

interface Props {
  children: ReactNode;
}

const NoAuthRoute = ({children}: Props) => {
  const {isSignedIn, isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  if (isLoaded && isSignedIn) {
    return <Navigate to="/" replace />
  }

  return children;
}

export default NoAuthRoute