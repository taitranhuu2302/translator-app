import React, { useState } from "react";
import { Bot, Database, Keyboard, Languages, Settings2, Volume2 } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { useSettings } from "./use-settings";
import { TranslationSection } from "./translation-section";
import { AiSection } from "./ai-section";
import { ShortcutsSection } from "./shortcuts-section";
import { BehaviorSection } from "./behavior-section";
import { DataSection } from "./data-section";
import { VoiceSection } from "./voice-section";
import { cn } from "../../../lib/utils";

type SettingsSection =
  | "translation"
  | "ai"
  | "shortcuts"
  | "voice"
  | "behavior"
  | "data";

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "translation", label: "Translation", icon: Languages },
  { id: "ai", label: "AI & Models", icon: Bot },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "voice", label: "Voice", icon: Volume2 },
  { id: "behavior", label: "Behavior", icon: Settings2 },
  { id: "data", label: "Data", icon: Database },
];

const SECTION_COMPONENTS: Record<SettingsSection, React.ComponentType> = {
  translation: TranslationSection,
  ai: AiSection,
  shortcuts: ShortcutsSection,
  voice: VoiceSection,
  behavior: BehaviorSection,
  data: DataSection,
};

export function SettingsPage() {
  const { isLoading } = useSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>("translation");
  const ActivePanel = SECTION_COMPONENTS[activeSection];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r bg-muted/20 p-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors",
              activeSection === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <ActivePanel />
      </div>
    </div>
  );
}
