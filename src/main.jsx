import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import "./index.css";

const disableNumberInputWheelChange = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "number") return;
  if (document.activeElement !== target) return;
  event.preventDefault();
};

document.addEventListener("wheel", disableNumberInputWheelChange, { passive: false });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
