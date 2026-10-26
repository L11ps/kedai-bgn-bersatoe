import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  title: 'KEDAI BGN BERSATOE - Berasa Gurih & Nikmat | Telkom University Jakarta',
  description:
    'Sistem pemesanan makanan online resmi KEDAI BGN BERSATOE untuk mahasiswa Universitas Telkom Jakarta. Nikmati Pangsit Chili Oil, Nasi Katsu Sambal Matah, Nasi Katsu Mentai, Mango Sticky Rice, dan Jus Segar.',
  icons: {
    icon: '/images/bgn-logo.jpg',
    apple: '/images/bgn-logo.jpg',
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
