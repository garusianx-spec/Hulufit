import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
