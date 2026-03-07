import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TranslationProvider } from "./hooks/useTranslation";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </React.StrictMode>,
);
