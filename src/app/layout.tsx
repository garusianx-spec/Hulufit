import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store/AppStore";
import { ToastProvider } from "@/components/ui/Toast";
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
 * The three faces every screen actually resolves to — body and `font-medium` → Light,
 * `font-bold` → Bold, `font-extrabold` → ExtraBold. Preloading removes the swap flash
 * on a TWA cold start. Black/ExtraBlack are declared in globals.css but unmatched, so
 * the browser never fetches them.
 */
const PRELOADED_FACES = [
  "/fonts/IRANYekanWebLight.woff2",
  "/fonts/IRANYekanWebBold.woff2",
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
            {children}
            <ServiceWorkerBridge />
          </ToastProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
