import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const protectedRoutes = ['/dashboard', '/jobs', '/applications', '/resume', '/preferences', '/profile'];

  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/applications/:path*',
    '/resume/:path*',
    '/preferences/:path*',
    '/profile/:path*',
  ],
};

