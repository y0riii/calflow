// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes only accessible to GUESTS (logged-out users)
const authRoutes = ['/login', '/register'];

// Routes only accessible to AUTHENTICATED users
const protectedRoutes = ['/dashboard', '/profile', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Verify access token validity
  let isAuthenticated = false;
  if (accessToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
      await jwtVerify(accessToken, secret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false; // Token expired or tampered
    }
  }

  // SCENARIO A: Authenticated user tries to visit /login or /register
  // REDIRECT TO HOME / DASHBOARD
  if (isAuthenticated && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // SCENARIO B: Unauthenticated user tries to visit protected routes
  // REDIRECT TO LOGIN
  if (!isAuthenticated && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, assets, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};