import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import "./globals.css";
import VersionDisplay from "@/components/ui/VersionDisplay";

const inter = Inter({ subsets: ["latin"] });

/**
 * Metadata for the application.
 */
export const metadata: Metadata = {
  title: "Friendle - Shared Wordle",
  description: "Play Wordle with friends!",
};

/**
 * Viewport configuration for the application.
 * Ensures the app is responsive and scalable.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Root layout component for the application.
 * Wraps all pages and applies global styles and analytics.
 *
 * @param props - The component props.
 * @param props.children - The child components (pages) to render.
 * @returns The root layout structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <VersionDisplay />
        <Analytics />
      </body>
    </html>
  );
}
