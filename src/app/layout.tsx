import type { Metadata, Viewport } from 'next';
import './globals.css';
import AccessibilityBar from '@/components/AccessibilityBar';
import { isDevMailboxEnabled } from '@/lib/mailer';

export const metadata: Metadata = {
  title: 'Mijn Werkplank — Open-Source Vrijmetselaars App',
  description:
    'Gebruiksvriendelijke web- en mobiele app voor vrijmetselaarsloges: werkplanken, broedermaal, ledenlijst, bouwstukken en visiteren.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Werkplank',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B365D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const devMailbox = isDevMailboxEnabled();

  return (
    <html lang="nl" data-font-scale="normal">
      <body className="antialiased">
        <AccessibilityBar devMailboxEnabled={devMailbox} />
        {children}
      </body>
    </html>
  );
}
