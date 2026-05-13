import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { esMX } from "@clerk/localizations";
import AuthProvider from "./AuthProvider";

const AllProviders = ({children}: {children: ReactNode}) => {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  if (!PUBLISHABLE_KEY) {
    throw new Error("Publishable key de Clerk no encontrado");
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={esMX}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClerkProvider>
  )
}

export default AllProviders