import type { ReactNode } from "react"
import { MemoryRouter } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { esMX } from "@clerk/localizations";
import { ImageKitProvider } from "@imagekit/react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "@/pages/ErrorPage";

const Fallback = ({ error }: { error: Error }) => {
  console.log(error);

  return (
    <ErrorPage
      title="¡Oops! Algo salió mal."
      message="Actualiza la página e inténtalo de nuevo."
    />
  )
}

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
    <ErrorBoundary FallbackComponent={Fallback}>
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
    </ErrorBoundary>
  )
}

export default Providers