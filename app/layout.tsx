import './globals.css';
import { Bebas_Neue } from 'next/font/google';

const bebas = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

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
