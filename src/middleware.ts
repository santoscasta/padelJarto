import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets, API routes, and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  // Public pages that don't need auth
  const publicPaths = ["/", "/login", "/t", "/invite"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // For /app/* routes, check for session cookie
  // The actual auth validation happens in requireCurrentUser();
  // this middleware provides a fast redirect for obvious no-session cases.
  const hasSession =
    request.cookies.has("sb-access-token") ||
    request.cookies.has("sb-refresh-token") ||
    request.cookies.has("padeljarto-demo-session") ||
    // Supabase SSR stores auth in cookies with project-specific prefixes
    [...request.cookies.getAll()].some((c) => c.name.includes("auth-token"));

  if (!hasSession && pathname.startsWith("/app")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
