import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, Space_Mono } from "next/font/google";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: "#08070b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Celestial Observatory",
  description:
    "An immersive 3D simulation exploring Earth's axial tilt, orbital mechanics, and the beautiful dance of seasons. Watch solar declination change as our planet journeys around the Sun.",
  keywords: [
    "earth",
    "seasons",
    "simulation",
    "3D",
    "astronomy",
    "axial tilt",
    "solstice",
    "equinox",
    "orbital mechanics",
    "education",
  ],
  authors: [{ name: "Celestial Observatory" }],
  creator: "Celestial Observatory",
  openGraph: {
    title: "Celestial Observatory",
    description:
      "An immersive 3D simulation exploring Earth's journey through the seasons.",
    type: "website",
    locale: "en_US",
    siteName: "Celestial Observatory",
  },
  twitter: {
    card: "summary_large_image",
    title: "Celestial Observatory",
    description:
      "An immersive 3D simulation exploring Earth's journey through the seasons.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-obsidian text-cream antialiased ${display.variable} ${body.variable} ${mono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
