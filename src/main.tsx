import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import "./styles/index.css";
import { AuthGateInternal } from "./app/auth/AuthGateInternal";
import { ToastProvider } from "./app/hooks/useToast";
import { ErrorBoundary } from "./app/components/ErrorBoundary";

import('@sentry/react').then((Sentry) => {
  Sentry.init({
    dsn: "https://db553cc6bdd6e17d732fa630a7b77baa@o4511022107590657.ingest.de.sentry.io/4511022282571856",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || "production",
  });
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ErrorBoundary>
      <ToastProvider>
        <AuthGateInternal>
          <App />
        </AuthGateInternal>
      </ToastProvider>
    </ErrorBoundary>
  </BrowserRouter>
);
