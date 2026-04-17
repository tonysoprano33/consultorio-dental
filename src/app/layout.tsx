import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import PwaBootstrap from '../../components/PwaBootstrap';
import './globals.css';

export const metadata: Metadata = {
  title: 'Consultorio Dental - Nazarena',
  description: 'Gestion de turnos, pacientes y recordatorios',
  manifest: '/manifest.webmanifest',
  applicationName: 'Consultorio Dental',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Consultorio Dental',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#24352a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaBootstrap />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
