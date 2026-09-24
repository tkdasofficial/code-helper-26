import "../styles.css";
import { Providers } from "./providers";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Hyper Copilot",
  description:
    "Hyper Copilot is an all-in-one multi-modal AI platform for image, video, audio, and AI influencer creation, inspired by Adobe Firefly.",
  icons: {
    icon: [
      {
        url: "/light_app_icon.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/dark_app_icon.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Hyper Copilot",
    description:
      "Hyper Copilot is an all-in-one multi-modal AI platform for image, video, audio, and AI influencer creation, inspired by Adobe Firefly.",
    siteName: "Hyper Copilot",
    type: "website",
    url: "https://hypercopilot.vercel.app/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyper Copilot",
    description:
      "Hyper Copilot is an all-in-one multi-modal AI platform for image, video, audio, and AI influencer creation, inspired by Adobe Firefly.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
