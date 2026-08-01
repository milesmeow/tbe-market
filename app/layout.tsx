import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { APP_NAME } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Warm, dignified serif for headings (variable weight + optical sizing).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — a community marketplace.`,
};

// `viewportFit: "cover"` is what makes env(safe-area-inset-*) non-zero — without
// it the `pb-safe` helper in globals.css silently resolves to 0 on iPhones.
// Deliberately no `maximumScale`/`userScalable`: blocking pinch-zoom would be an
// accessibility regression, and the default (scalable) is what we want.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f4", // matches --background in globals.css
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Footer />
      </body>
    </html>
  );
}
