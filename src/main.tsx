import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ImageKitProvider } from "@imagekit/react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Toaster } from "sonner";
import App from "./App.tsx";
import ErrorPage from "./pages/ErrorPage";
import AllProviders from "./providers/AllProviders";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const Fallback = ({ error }: FallbackProps) => {
  console.error(error);

  return (
    <ErrorPage
      title="¡Oops! Algo salió mal."
      message="Actualiza la página e inténtalo de nuevo."
    />
  )
}

const MyApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AllProviders>
        <BrowserRouter>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <QueryErrorResetBoundary>
              {({ reset }) => (
                <ErrorBoundary onReset={reset} FallbackComponent={Fallback}>
                  <App />
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </ImageKitProvider>
        </BrowserRouter>

        <Toaster position="bottom-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </AllProviders>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById("root")!).render(<MyApp />);