import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import InstallPrompt from "./components/InstallPrompt.jsx";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <App />
              <InstallPrompt />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3500,
                  style: {
                    borderRadius: "14px",
                    background: "#1e1b2e",
                    color: "#fff",
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    boxShadow: "0 10px 30px -8px rgba(124, 58, 237, 0.35)",
                  },
                  success: {
                    iconTheme: { primary: "#7c3aed", secondary: "#fff" },
                  },
                  error: {
                    iconTheme: { primary: "#f43f5e", secondary: "#fff" },
                  },
                }}
              />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for web push (best-effort).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* swallow — push is optional */
    });
  });
}
