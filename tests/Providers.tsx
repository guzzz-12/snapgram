import type { ReactNode } from "react"
import { MemoryRouter } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { esMX } from "@clerk/localizations";
import { ImageKitProvider } from "@imagekit/react";

interface Props {
  children: ReactNode;
}

const Providers = ({ children }: Props) => {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!PUBLISHABLE_KEY) {
    throw new Error("Publishable key de Clerk no encontrado");
  }

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return (
    <QueryClientProvider client={client}>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        localization={esMX}
      >
        <MemoryRouter>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            {children}
          </ImageKitProvider>
        </MemoryRouter>
      </ClerkProvider>
    </QueryClientProvider>
  )
}

export default Providers