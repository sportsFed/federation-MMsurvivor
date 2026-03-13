import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Firebase Auth typically sets a cookie named '__session' 
  // when using service workers or manual cookie management.
  const session = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = 
    pathname.startsWith('/my-picks') || 
    pathname.startsWith('/my-bracket') || 
    pathname.startsWith('/admin');

  // 1. Redirect to login if no session exists
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Admin Gate
  // For maximum security, the Admin role check should also be performed 
  // inside 'app/admin/layout.tsx' using the Admin SDK.
  if (pathname.startsWith('/admin') && session) {
    // Logic for verifying the 'admin' custom claim or cookie property goes here.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/my-picks/:path*',
    '/my-bracket/:path*',
    '/admin/:path*',
  ],
};