import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./components/ui/sonner";
import { QuickApp } from "./renderer/features/quick-popup/quick-app";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: 0 } },
});

const container = document.getElementById("root") ?? document.body;
createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <HotkeysProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <QuickApp />
        <Toaster richColors expand position="top-center" closeButton />
      </ThemeProvider>
    </HotkeysProvider>
  </QueryClientProvider>,
);
