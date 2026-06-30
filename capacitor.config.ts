import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.threeyadaai.clinic",
  appName: "عيادة AI",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "http",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#ecfdf8",
      showSpinner: false,
    },
  },
};

export default config;
