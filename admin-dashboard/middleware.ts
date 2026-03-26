import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if trying to access admin routes
  if (pathname.startsWith('/admin')) {
    // In a real app, you'd verify the JWT token here
    // For now, we'll let the client handle the redirect if token is missing
    // The client-side will check for the token in localStorage
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
