import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource/caveat/latin-500.css";
import "@fontsource/caveat/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { ToastProvider } from "./ui/Toast";

// Hors ligne : le service worker met l'appli en cache et se met à jour tout seul.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
