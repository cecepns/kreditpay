import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "@/context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerStyle={{
            top: 24,
            pointerEvents: "none",
          }}
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: "14px",
              fontWeight: 600,
              pointerEvents: "auto",
            },
            success: {
              duration: 2500,
            },
            error: {
              duration: 3500,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
