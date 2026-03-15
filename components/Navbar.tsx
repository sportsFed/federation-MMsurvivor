'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/clientApp';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const NAV_LINKS = [
  { href: '/my-picks', label: 'My Picks' },
  { href: '/standings', label: 'Standings' },
  { href: '/my-bracket', label: 'My Bracket' },
  { href: '/rules', label: 'Rules' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <img src="/Fed-Logo.png" alt="Federation" className="h-10 w-auto" />
          <span className="font-bebas text-xl tracking-widest text-white hidden sm:block">MM Survivor</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`font-bebas text-lg tracking-widest transition-colors ${
                pathname === href
                  ? 'text-fedRed border-b-2 border-fedRed pb-0.5'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right: user name + sign out */}
        <div className="hidden md:flex items-center gap-4">
          {user?.displayName && (
            <span className="text-slate-400 text-sm font-sans">{user.displayName}</span>
          )}
          <button
            onClick={handleSignOut}
            className="font-bebas text-lg tracking-widest text-white bg-fedRed hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden text-slate-300 hover:text-white p-2"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pb-4 pt-2 flex flex-col gap-3">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`font-bebas text-xl tracking-widest transition-colors ${
                pathname === href ? 'text-fedRed' : 'text-slate-300 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          {user?.displayName && (
            <span className="text-slate-500 text-sm font-sans">{user.displayName}</span>
          )}
          <button
            onClick={() => { setMenuOpen(false); handleSignOut(); }}
            className="font-bebas text-xl tracking-widest text-white bg-fedRed hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
