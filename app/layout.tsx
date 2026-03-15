import './globals.css';
import { Bebas_Neue } from 'next/font/google';

const bebas = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

export const metadata = {
  title: 'March Madness Survivor | The Federation',
  description: 'The Federation March Madness Survivor Pool 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bebas.variable}>
      <body style={{ 
        backgroundColor: '#0b1120', 
        color: 'white', 
        margin: 0, 
        fontFamily: 'var(--font-bebas), sans-serif' 
      }}>
        {children}
      </body>
    </html>
  );
}
