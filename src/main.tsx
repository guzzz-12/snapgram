import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { esMX } from "@clerk/localizations";
import App from "./App.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Publishable key de Clerk no encontrado");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    localization={esMX}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
);