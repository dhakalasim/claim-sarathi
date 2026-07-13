import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./i18n";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("root element not found");

/**
 * The GitHub Pages static build has no real API to call, so it runs an
 * in-browser mock (MSW) seeded with the same demo data as
 * apps/api/prisma/seed.ts. Only active when VITE_DEMO_MODE=true — a real
 * deployment behind an actual API never loads this.
 */
async function enableMockingIfDemo(): Promise<void> {
  if (import.meta.env.VITE_DEMO_MODE !== "true") return;
  const { worker } = await import("./mocks/browser");
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: "bypass",
  });
}

enableMockingIfDemo().then(() => {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
