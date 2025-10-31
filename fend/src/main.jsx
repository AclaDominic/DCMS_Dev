import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";

import { AuthProvider } from "./hooks/useAuth";
import { NotificationsProvider } from "./context/NotificationsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.jsx";

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found! Make sure there's a <div id='root'></div> in index.html");
} else {
  console.log("React app starting...");
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
  console.log("React app rendered successfully");
}