import "./globals.css";
import { Bebas_Neue } from 'next/font/google';

const bebas = Bebas_Neue({ 
  weight: '400', 
  subsets: ['latin'], 
  variable: '--font-bebas' 
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} dark`}>
      <body className="min-h-screen">
        {/* Consistent Slim Navbar */}
        <nav className="h-16 border-b border-white/5 bg-slate-950/50 backdrop-blur-md flex items-center px-6 sticky top-0 z-50">
          <div className="flex items-center gap-3 mr-10">
            <img src="/Fed-Logo.png" alt="Logo" className="h-10 w-10" />
            <span className="font-bebas text-2xl text-white">The Federation</span>
          </div>
          <div className="flex gap-8 font-bebas text-lg text-slate-400">
            {/* Nav links inherit global hover/active styles */}
            <a href="/my-picks" className="hover:text-red-500">My Picks</a>
            <a href="/standings" className="hover:text-red-500">Standings</a>
          </div>
        </nav>

        {/* Global Page Padding */}
        <main className="max-w-6xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
