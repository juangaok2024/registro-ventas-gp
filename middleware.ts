// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/', '/chat'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/login') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if path is protected
  const isProtected = PROTECTED_PATHS.some(path =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('auth_token');

  if (!authCookie || authCookie.value !== 'medellin_authenticated') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
