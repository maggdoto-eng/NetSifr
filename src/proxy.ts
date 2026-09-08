import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Next.js 16 renamed middleware.ts -> proxy.ts (same mechanism, see
// https://nextjs.org/docs/messages/middleware-to-proxy). This is an
// *optimistic* check only (cookie-based, no DB round-trip) — every real
// authorization decision is re-checked against the database in the DAL
// (src/lib/dal.ts), which this cannot replace. See the Next.js
// authentication guide's "Optimistic checks with Proxy" section.

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/admin/login',
  '/forgot-password',
  '/reset-password/',
  '/join/',
  '/verify-email/',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth?.user;

  if (!isAuthed && !isPublicPath(pathname)) {
    // The admin console is a separate door: send unauthenticated visitors to
    // the admin login, everyone else to the participant login.
    const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
    const target = isAdminArea ? '/admin/login' : '/login';
    const loginUrl = new URL(target, req.nextUrl);
    if (!isAdminArea) loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && pathname === '/login') {
    return NextResponse.redirect(new URL('/programs', req.nextUrl));
  }

  if (isAuthed && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Route Handlers do their own per-request auth checks (see the guide) —
  // this proxy only gates page navigation.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
