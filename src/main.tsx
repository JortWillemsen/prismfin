import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/common/styles/global.scss";
import { applyAppBranding } from "@/common/constants/config";

// Initialize dynamic application branding & accent colors
applyAppBranding();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
