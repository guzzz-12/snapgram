import { Suspense, useState, type ReactNode } from "react";
import { MemoryRouter, type InitialEntry } from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary
} from "@tanstack/react-query";
import { ImageKitProvider } from "@imagekit/react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Toaster } from "sonner";
import ErrorPage from "@/pages/ErrorPage";
import AllProviders from "@/providers/AllProviders";

const Fallback = ({ error }: FallbackProps) => {
  console.error(error);

  return (
    <ErrorPage
      title="¡Oops! Algo salió mal."
      message="Actualiza la página e inténtalo de nuevo."
    />
  );
};

interface Props {
  initialEntries?: InitialEntry[];
  children: ReactNode;
}

const Providers = ({ initialEntries, children }: Props) => {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!PUBLISHABLE_KEY) {
    throw new Error("Publishable key de Clerk no encontrado");
  }

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AllProviders>
        <MemoryRouter initialEntries={initialEntries}>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary onReset={reset} FallbackComponent={Fallback}>
                  <Suspense fallback={null}>{children}</Suspense>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </ImageKitProvider>
        </MemoryRouter>
        <Toaster position="bottom-right" />
      </AllProviders>
    </QueryClientProvider>
  );
};

export default Providers;