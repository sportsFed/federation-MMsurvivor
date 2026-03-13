import "./globals.css";
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50">
        <nav className="bg-blue-900 text-white p-4 shadow-md">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-black text-xl tracking-tighter">FEDERATION</Link>
            <div className="space-x-6 text-sm font-medium">
              <Link href="/my-picks" className="hover:text-blue-200">My Picks</Link>
              <Link href="/standings" className="hover:text-blue-200">Standings</Link>
              <Link href="/final-four" className="hover:text-blue-200">Final Four</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
