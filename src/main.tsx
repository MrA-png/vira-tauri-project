import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import SettingsWindow from "./SettingsWindow";
import HistoryWindow from "./HistoryWindow";
import "./index.css";


const appLabel = getCurrentWindow().label;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {appLabel === "settings" ? (
      <SettingsWindow />
    ) : appLabel === "history" ? (
      <HistoryWindow />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
