import { formatForDisplay } from "@tanstack/react-hotkeys";
import { bridge } from "./bridge";

/**
 * Converts an Electron accelerator string (e.g. "CommandOrControl+Shift+Space")
 * to the @tanstack/hotkeys normalised format (e.g. "Mod+Shift+Space").
 */
function electronToTanstack(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl|CmdOrCtrl/gi, "Mod")
    .replace(/Command|Cmd/gi, "Meta")
    .replace(/Option/gi, "Alt");
}

/**
 * Returns an array of display-ready key parts for a given Electron accelerator.
 *
 * Windows/Linux: ["Ctrl", "Shift", "Space"]
 * macOS:         ["⌘", "⇧", "␣"]
 *
 * Each part can be rendered as an individual <Kbd> element.
 */
export function formatAcceleratorParts(accelerator: string): string[] {
  const platform = bridge.runtime.platform === "darwin" ? "mac" : "windows";
  const normalised = electronToTanstack(accelerator);
  const display = formatForDisplay(normalised, {
    platform,
    useSymbols: platform === "mac",
  });
  // formatForDisplay uses ' ' as separator on mac (symbols), '+' elsewhere
  const separator = platform === "mac" ? " " : "+";
  return display.split(separator).filter(Boolean);
}
