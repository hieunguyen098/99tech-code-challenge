import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { AppProviders } from "./app/AppProviders";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
