import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { esMX } from "@clerk/localizations";
import { useTheme } from "next-themes";
import AuthProvider from "./AuthProvider";

const AllProviders = ({children}: {children: ReactNode}) => {
  const { resolvedTheme } = useTheme();
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!PUBLISHABLE_KEY) {
    throw new Error("Publishable key de Clerk no encontrado");
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={esMX}
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#4F39F6"
        }
      }}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClerkProvider>
  )
}

export default AllProviders