'use client';

import { useState, useEffect } from 'react';
import "./globals.css";
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <html lang="en" className={darkMode ? 'dark' : ''}>
      <body className="antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <nav className="bg-fedRed border-b-4 border-fedBlack dark:border-slate-700 text-white p-2 shadow-xl">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* The Federation Logo Header */}
            <Link href="/" className="flex items-center gap-3">
              <img src="/Fed-Logo.png" alt="Fed Logo" className="w-12 h-12" />
              <span className="font-brand italic text-2xl font-black tracking-tighter">The Federation</span>
            </Link>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex space-x-6 text-sm font-bold uppercase tracking-widest">
                <Link href="/my-picks" className="hover:text-fedBlack transition">My Picks</Link>
                <Link href="/standings" className="hover:text-fedBlack transition">Standings</Link>
                <Link href="/final-four" className="hover:text-fedBlack transition">Final Four</Link>
              </div>

              {/* Dark Mode Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-fedBlack rounded-full hover:scale-110 transition shadow-lg"
                title="Toggle Dark Mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </nav>
        
        <main className="min-h-screen pt-6 px-4">
          {children}
        </main>

        <footer className="p-8 border-t dark:border-slate-800 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Established 2015 • Ten Sports • One Champion [cite: 2, 7]
        </footer>
      </body>
    </html>
  );
}
