import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@trackster/components/v3/v3.css';
import '@trackster/components/v3/pseudo.css';
import './invest.css';
import { InvestProvider } from '@/components/InvestProvider';

export const metadata: Metadata = { title: 'Invest — Trackster', description: 'Rencanakan jatah investasi bulanan dari pemasukan Trackster.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1B1814' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="id" suppressHydrationWarning><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head><body><InvestProvider>{children}</InvestProvider><Script src="/track-mascot.js" strategy="afterInteractive" /></body></html>;
}
