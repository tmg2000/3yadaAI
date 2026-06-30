import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import { initAppConfig } from "./config";
import "./index.css";

document.documentElement.dir = "rtl";
document.documentElement.lang = "ar";

const root = document.getElementById("root")!;

async function bootstrap() {
  await initAppConfig();
  createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}

void bootstrap();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
