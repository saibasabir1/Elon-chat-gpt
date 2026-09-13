import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mrelonhacker.app",
  appName: "MR ELON HACKER",
  webDir: "public",
  server: {
    url: "https://elon-chat-gpt.vercel.app/",
    cleartext: false,
  },
};

export default config;