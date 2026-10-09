import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import { NavigationProvider } from "@/components/navigation";
import "./globals.css";
import "./phone.css";

export const metadata: Metadata = {
  title: "Commonplace · Personal Discovery",
  description:
    "Discover deliberately, understand deeply, and know when you have enough.",
  appleWebApp: {
    capable: true,
    title: "Commonplace",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/commonplace-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1c231e" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavigationProvider>
          <AppProvider>
            <Shell>{children}</Shell>
          </AppProvider>
        </NavigationProvider>
      </body>
    </html>
  );
}
