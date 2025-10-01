import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { esMX } from "@clerk/localizations";
import { ImageKitProvider } from "@imagekit/react";
import App from "./App.tsx";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Publishable key de Clerk no encontrado");
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={esMX}
    >
      <BrowserRouter>
        <ImageKitProvider urlEndpoint="https://ik.imagekit.io/y1lpjbueh/">
          <App />
        </ImageKitProvider>
      </BrowserRouter>
    </ClerkProvider>
  </QueryClientProvider>
);