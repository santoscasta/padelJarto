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
    default: "PadelJarto",
    template: "%s | PadelJarto",
  },
  description: "Gestiona torneos privados de pádel con grupos, ranking y cuadro final.",
  applicationName: "PadelJarto",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PadelJarto",
    description: "Gestiona torneos privados de pádel con grupos, ranking y cuadro final.",
    locale: "es_ES",
    siteName: "PadelJarto",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PadelJarto",
    description: "Gestiona torneos privados de pádel con grupos, ranking y cuadro final.",
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
