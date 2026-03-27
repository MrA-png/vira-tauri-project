import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import SettingsWindow from "./SettingsWindow";
import "./index.css";


const appLabel = getCurrentWindow().label;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {appLabel === "settings" ? <SettingsWindow /> : <App />}
  </React.StrictMode>,
);
