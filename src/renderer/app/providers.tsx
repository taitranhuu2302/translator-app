import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { ThemeProvider } from "next-themes";
import { Toaster } from "../../components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HotkeysProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors expand position="top-center" closeButton />
        </ThemeProvider>
      </HotkeysProvider>
    </QueryClientProvider>
  );
}
