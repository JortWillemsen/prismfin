/// <reference path="./vite-env.d.ts" />
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/common/styles/global.scss";
import { applyAppBranding } from "@/common/constants/config";

// Initialize dynamic application branding & accent colors
applyAppBranding();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
