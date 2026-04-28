import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { PublisherGithub } from "@electron-forge/publisher-github";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const APP_BUNDLE_ID = "com.taitranhuu2302.nextgtranslate";
const APPLE_ID = process.env.APPLE_ID;
const APPLE_APP_SPECIFIC_PASSWORD = process.env.APPLE_APP_SPECIFIC_PASSWORD;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "NextGTranslate",
    executableName: "nextg-translate",
    icon: "assets/logo",
    extraResource: ["assets"],
    appBundleId: APP_BUNDLE_ID,
    osxSign: {
      hardenedRuntime: true,
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
    },
    ...(APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID
      ? {
          osxNotarize: {
            appleId: APPLE_ID,
            appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
            teamId: APPLE_TEAM_ID,
          },
        }
      : {}),
    extendInfo: {
      NSAppleEventsUsageDescription:
        'NextG Translate needs Automation permission to control "System Events" so it can copy selected text from other apps.',
      NSMicrophoneUsageDescription:
        "NextG Translate needs microphone access for speech input features.",
    },
  },
  makers: [
    new MakerSquirrel({ name: "NextGTranslate" }),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "taitranhuu2302",
        name: "translator-app",
      },
      prerelease: false,
      draft: true,
      generateReleaseNotes: true,
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
        {
          name: "quick_window",
          config: "vite.renderer.quick.config.ts",
        },
        {
          name: "loading_window",
          config: "vite.renderer.loading.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
