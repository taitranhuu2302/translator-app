import React, { useEffect, useState } from "react";
import { Languages, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Providers } from "./renderer/app/providers";
import { TranslatePage } from "./renderer/features/translate/translate-page";
import { SettingsPage } from "./renderer/features/settings/settings-page";
import { bridge } from "./renderer/lib/bridge";

type TabValue = "translate" | "settings";

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("translate");

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
            <Languages className="size-3.75 text-primary" />
            <span className="text-xs font-semibold tracking-tight text-foreground/70">
              NextG
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
              value="settings"
              className="h-full rounded-none px-3 text-xs gap-1.5 before:hidden"
            >
              <Settings className="size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </header>

        <TabsContent
          value="translate"
          className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <TranslatePage />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-auto m-0">
          <SettingsPage />
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
