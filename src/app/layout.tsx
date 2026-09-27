import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { isClerkConfigured } from "@/lib/clerk-config";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cortex — The Company Brain",
    template: "%s · Cortex",
  },
  description:
    "Cortex turns your company's scattered know-how into a living, cited map of how you work — and an executable skills file any AI agent can run.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const app = (
    <>
      {children}
      <Toaster theme="dark" richColors toastOptions={{ className: "font-sans" }} />
    </>
  );

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-ink text-paper antialiased`}
      >
        {isClerkConfigured() ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#8b5cf6",
                colorBackground: "#0d1017",
                colorForeground: "#f4f1ec",
                colorMutedForeground: "#898b94",
                colorInput: "#121620",
                colorInputForeground: "#f4f1ec",
                borderRadius: "0.625rem",
              },
              elements: {
                cardBox: "shadow-2xl shadow-black/40",
                card: "border border-white/10",
              },
            }}
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
