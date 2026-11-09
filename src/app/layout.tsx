import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  title: 'KEDAI BGN BERSATOE - Berasa Gurih & Nikmat | Telkom University Jakarta',
  description:
    'Sistem pemesanan makanan online resmi KEDAI BGN BERSATOE untuk mahasiswa Universitas Telkom Jakarta. Nikmati Nasi Katsu Mentai, Pangsit Chili Oil, Jus Buah, dan Mango Bread Soup.',
  icons: {
    icon: [
      { url: '/images/bgn-logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/images/bgn-logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/images/bgn-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#071324] text-slate-900 font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
