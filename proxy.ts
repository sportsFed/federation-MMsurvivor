import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rename the function from middleware to proxy
export function proxy(request: NextRequest) {
  // Your existing auth/redirect logic here...
  return NextResponse.next()
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
