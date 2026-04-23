import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function LoadingApp() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-transparent">
      <div className="rounded-full border-2 border-primary/30 border-t-primary size-7 animate-spin" />
    </div>
  );
}

const container = document.getElementById("root") ?? document.body;
createRoot(container).render(<LoadingApp />);
