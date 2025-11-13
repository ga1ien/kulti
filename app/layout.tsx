import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LoadingScreen } from "@/components/loading-screen";
import { ToastProvider } from "@/components/providers/toast-provider";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Build Together, Live",
  description: "Real-time pair programming sessions with video, audio, and code sharing. Join live coding sessions or create your own collaborative workspace. Build better, together.",
  metadataBase: new URL('https://kulti.com'),
  openGraph: {
    title: "Build Together, Live",
    description: "Real-time pair programming sessions with video, audio, and code sharing. Join live coding sessions or create your own collaborative workspace.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kulti - Build Together, Live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Build Together, Live",
    description: "Real-time pair programming sessions with video, audio, and code sharing. Build better, together.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <LoadingScreen />
        <ToastProvider />
        <ErrorBoundary>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
