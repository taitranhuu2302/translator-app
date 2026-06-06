import React, { Suspense, lazy, useEffect, useState } from "react";
import { History, Languages, Settings, Wand2 } from "lucide-react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Providers } from "./renderer/app/providers";
import { TranslatePage } from "./renderer/features/translate/translate-page";
import { Spinner } from "./components/ui/spinner";
import { bridge } from "./renderer/lib/bridge";

const ImprovePage = lazy(() =>
  import("./renderer/features/improve/improve-page").then((m) => ({
    default: m.ImprovePage,
  })),
);
const SettingsPage = lazy(() =>
  import("./renderer/features/settings/settings-page").then((m) => ({
    default: m.SettingsPage,
  })),
);
const HistoryPage = lazy(() =>
  import("./renderer/features/history/history-page").then((m) => ({
    default: m.HistoryPage,
  })),
);

type TabValue = "translate" | "improve" | "history" | "settings";

const TabFallback = () => (
  <div className="flex flex-1 items-center justify-center">
    <Spinner className="size-5 text-muted-foreground" />
  </div>
);

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("translate");

  useHotkeys([
    { hotkey: "Control+1", callback: () => setActiveTab("translate") },
    { hotkey: "Control+2", callback: () => setActiveTab("improve") },
    { hotkey: "Control+3", callback: () => setActiveTab("history") },
    { hotkey: "Control+4", callback: () => setActiveTab("settings") },
  ]);

  useEffect(() => {
    const unsub = bridge.app.onNavigate((route) => {
      if (route === "/settings") setActiveTab("settings");
      else setActiveTab("translate");
    });
    return unsub;
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* Clean header */}
        <header className="shrink-0 flex items-center gap-3 border-b px-4">
          {/* Branding */}
          <div className="flex items-center gap-1.5 py-2.5 select-none">
            <img src="logo.png" className="size-8" alt="Neris" />
            <span className="text-xs font-semibold tracking-tight text-foreground/70">
              Neris
            </span>
          </div>

          <div className="w-px self-stretch bg-border/50 my-2" />

          {/* Underline-style nav tabs */}
          <TabsList
            variant="line"
            className="h-10.25 rounded-none gap-0 p-0 bg-transparent"
          >
            <TabsTrigger
              value="translate"
              className="h-full rounded-none px-3 text-xs gap-1.5 before:hidden"
            >
              <Languages className="size-3.5" />
              Translate
            </TabsTrigger>
            <TabsTrigger
              value="improve"
              className="h-full rounded-none px-3 text-xs gap-1.5 before:hidden"
            >
              <Wand2 className="size-3.5" />
              Improve
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="h-full rounded-none px-3 text-xs gap-1.5 before:hidden"
            >
              <History className="size-3.5" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="h-full rounded-none px-3 text-xs gap-1.5 before:hidden"
            >
              <Settings className="size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </header>

        <TabsContent
          forceMount
          value="translate"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
        >
          <TranslatePage isActive={activeTab === "translate"} />
        </TabsContent>

        <TabsContent
          forceMount
          value="improve"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
        >
          <Suspense fallback={<TabFallback />}>
            <ImprovePage />
          </Suspense>
        </TabsContent>

        <TabsContent
          forceMount
          value="history"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
        >
          <Suspense fallback={<TabFallback />}>
            <HistoryPage />
          </Suspense>
        </TabsContent>

        <TabsContent
          forceMount
          value="settings"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
        >
          <Suspense fallback={<TabFallback />}>
            <SettingsPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
