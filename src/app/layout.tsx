import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter, Barlow_Condensed } from 'next/font/google';
import '../styles/global.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

// Self-hosted via next/font — stays inside our CSP (no external font-src needed).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Padeljarto',
  description: 'Torneos de padel entre amigos',
  applicationName: 'Padeljarto',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0a0d12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  void nonce;
  return (
    <html lang="es" className={`${inter.variable} ${barlow.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
