import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'HealthMitra - Your Health, Our Priority',
  description: 'Healthcare client dashboard for HealthMitra',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  verification: {
    google: 'xPXOZCTnAZ19KbfJXo9M7sFtGUIY0ZUtoEHC8rhfoOY',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
