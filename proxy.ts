import { NextResponse, type NextRequest } from 'next/server';
export function proxy(req: NextRequest) {
  if (!req.cookies.has('tm_session'))
    return NextResponse.redirect(new URL('/cuenta', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/admin/:path*', '/aula/:path*'] };
