import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import { getAppUrl } from "@/lib/env";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "PadelFlow",
    template: "%s | PadelFlow",
  },
  description: "Gestión de torneos de pádel con liguilla, playoffs, invitaciones y parejas.",
  applicationName: "PadelFlow",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PadelFlow",
    description: "Gestión de torneos de pádel con liguilla, playoffs, invitaciones y parejas.",
    locale: "es_ES",
    siteName: "PadelFlow",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PadelFlow",
    description: "Gestión de torneos de pádel con liguilla, playoffs, invitaciones y parejas.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PadelFlow",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${bricolage.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#110d0c] text-[#fff7ed]">{children}</body>
    </html>
  );
}
