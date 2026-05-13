import type { ReactNode } from "react";
import { MemoryRouter, type InitialEntry } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorPage from "@/pages/ErrorPage";
import AllProviders from "@/providers/AllProviders";

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
  initialEntries?: InitialEntry[];
  children: ReactNode;
}

const Providers = ({initialEntries, children }: Props) => {
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
        <AllProviders>
          <MemoryRouter initialEntries={initialEntries}>
            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
              {children}
            </ImageKitProvider>
          </MemoryRouter>
        </AllProviders>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default Providers