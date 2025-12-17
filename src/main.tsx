import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { esMX } from "@clerk/localizations";
import { ImageKitProvider } from "@imagekit/react";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App.tsx";
import ErrorPage from "./pages/ErrorPage.tsx";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "yet-another-react-lightbox/styles.css";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Publishable key de Clerk no encontrado");
}

const queryClient = new QueryClient();

const Fallback = ({error}: {error: Error}) => {
  console.log(error);

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
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        localization={esMX}
      >
        <BrowserRouter>
          <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
            <ErrorBoundary FallbackComponent={Fallback}>
              <App />
            </ErrorBoundary>
          </ImageKitProvider>
        </BrowserRouter>
      </ClerkProvider>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById("root")!).render(<MyApp />);