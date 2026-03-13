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
          <Link href="/" className="flex items-center gap-3 mr-10 group">
          {/* Absolute path /Fed-Logo.png ensures it loads on every sub-page */}
          <img src="/Fed-Logo.png" alt="Logo" className="h-10 w-10 transition group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="font-bebas text-2xl text-white leading-none">The Federation</span>
            <span className="text-[8px] text-red-600 font-bold tracking-widest uppercase">Est. 2015</span>
        </div>
      </Link>
  
      <div className="flex gap-8 font-bebas text-lg text-slate-400">
        <Link href="/my-picks" className="hover:text-red-500 transition">My Picks</Link>
        <Link href="/standings" className="hover:text-red-500 transition">Standings</Link>
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
