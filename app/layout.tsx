'use client';

import { useState } from 'react';
import "./globals.css";
import Link from 'next/link';
import { Bebas_Neue } from 'next/font/google';

const bebas = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <html lang="en" className={`${darkMode ? 'dark' : ''} ${bebas.variable}`}>
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
        <nav className="bg-fedRed border-b-4 border-fedBlack dark:border-slate-800 text-white p-3 shadow-xl">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-4">
              {/* This matches the file name you should use in the /public folder */}
              <img src="/Fed-Logo.png" alt="The Federation" className="h-12 w-auto" />
              <span className="font-bebas text-3xl tracking-wide uppercase">The Federation</span>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex space-x-6 font-bebas text-xl tracking-wider">
                <Link href="/my-picks" className="hover:text-fedBlack transition">My Picks</Link>
                <Link href="/standings" className="hover:text-fedBlack transition">Standings</Link>
                <Link href="/final-four" className="hover:text-fedBlack transition">Final Four</Link>
              </div>

              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-fedBlack rounded-full hover:scale-110 transition shadow-lg border border-fedWhite/20"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </nav>
        
        <main className="min-h-screen pt-6 px-4 max-w-7xl mx-auto">
          {children}
        </main>

        <footer className="p-12 border-t dark:border-slate-900 text-center font-bebas text-lg tracking-widest text-slate-400">
          Established 2015 • Ten Major Sports
        </footer>
      </body>
    </html>
  );
}
