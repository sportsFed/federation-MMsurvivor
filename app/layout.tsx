import './globals.css';
import { Bebas_Neue, Inter } from 'next/font/google';
import AppShell from '@/components/AppShell';

const bebas = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'March Madness Survivor | The Federation',
  description: 'The Federation March Madness Survivor Pool 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${inter.variable}`}>
      <body className="font-sans" style={{ 
        backgroundColor: '#0b1120', 
        color: 'white', 
        margin: 0,
      }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
