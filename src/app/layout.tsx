import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { PwaRegistration } from "@/lib/pwa/register-sw";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Chemate AI",
    template: "%s | Chemate AI",
  },
  description:
    "AI-powered study companion for Industrial Chemistry students with notes-grounded answers, revision tools, lab reports, and exam prediction.",
  applicationName: "Chemate AI",
  manifest: "/manifest.webmanifest",
  keywords: [
    "Chemate AI",
    "Industrial Chemistry",
    "student assistant",
    "Kenya university revision",
    "lab reports",
    "exam prediction",
  ],
  appleWebApp: {
    capable: true,
    title: "Chemate AI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#0bb7f4",
};

const themeScript = `
  (function() {
    try {
      var stored = window.localStorage.getItem("chemate-theme");
      var theme = stored === "light" || stored === "dark"
        ? stored
        : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      document.documentElement.dataset.theme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PwaRegistration />
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
