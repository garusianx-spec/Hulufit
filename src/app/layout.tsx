import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store/AppStore";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { ServiceWorkerBridge } from "@/components/layout/ServiceWorkerBridge";

export const metadata: Metadata = {
  applicationName: "HelloFit",
  title: {
    default: "هلوفیت | HelloFit",
    template: "%s | هلوفیت",
  },
  description:
    "هلوفیت — پلتفرم جامع رژیم غذایی، تمرین و مشاوره با متخصصین تغذیه و مربیان بدنسازی.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "HelloFit",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for the safe-area insets used across the shell.
  viewportFit: "cover",
};

/**
 * The three faces on the critical path — body → X Regular, `font-bold` → X Bold,
 * `font-extrabold` → Web ExtraBold. `font-medium` (X Medium) is used on far fewer
 * nodes, so it loads normally rather than competing for bandwidth on first paint.
 */
const PRELOADED_FACES = [
  "/fonts/IRANYekanX-Regular.woff2",
  "/fonts/IRANYekanX-Bold.woff2",
  "/fonts/IRANYekanWebExtraBold.woff2",
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ReactDOM.preload emits exactly one <link> per resource, in <head>.
  for (const href of PRELOADED_FACES) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans antialiased">
        {/*
          No auth gate by design: the app boots straight into the authenticated
          dashboard with pre-populated mock state. Sign-in lands in a later phase.
        */}
        <AppStoreProvider>
          <ToastProvider>
            <NotificationProvider>
              <OnboardingGate />
              {children}
              <ServiceWorkerBridge />
            </NotificationProvider>
          </ToastProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
