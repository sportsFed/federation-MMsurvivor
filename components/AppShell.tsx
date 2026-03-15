'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

const NO_NAVBAR_PATHS = ['/', '/login', '/register', '/auth/login', '/auth/register'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNavbar = !NO_NAVBAR_PATHS.includes(pathname) && !pathname.startsWith('/admin');

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}
