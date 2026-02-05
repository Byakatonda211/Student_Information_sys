import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep middleware SUPER light (Edge runtime).
// We only check whether a session cookie exists.
// Real DB validation will happen inside API routes / server actions.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow these without login
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const sessionId = req.cookies.get("sis_session")?.value;

  if (!sessionId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protect everything except login + auth login endpoint
export const config = {
  matcher: ["/((?!login|api/auth/login|_next|favicon.ico).*)"],
};
