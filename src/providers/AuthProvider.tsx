import { createContext, useContext, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

type ClerkSignOutOptions = {
  sessionId?: string;
  redirectUrl?: string;
};

type ClerkSignOut = {
  (options?: ClerkSignOutOptions): Promise<void>;
  (callback?: () => void | Promise<any>, options?: ClerkSignOutOptions): Promise<void>;
};

export interface AuthContext {
  userId: string | null | undefined;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  signOut: ClerkSignOut;
  getToken: () => Promise<string | null>;
};

interface AuthProviderProps {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContext>({
  userId: null,
  isLoaded: false,
  isSignedIn: false,
  signOut: async () => {},
  getToken: async () => null,
});

const AuthProvider = ({ children }: AuthProviderProps) => {
  const { isSignedIn, isLoaded } = useUser();
  const { userId, signOut, getToken } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        userId,
        isSignedIn,
        isLoaded,
        signOut,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);

export default AuthProvider;