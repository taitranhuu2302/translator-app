import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

const container = document.getElementById("root") ?? document.body;
const root = createRoot(container);
root.render(<App />);

requestAnimationFrame(() => {
  const splash = document.getElementById("app-splash");
  if (splash) {
    splash.style.transition = "opacity .15s ease-out";
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 150);
  }
});
