import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;
const cookieName = "__Secure-authjs.session-token";

async function getSessionToken(req: NextRequest) {
  // Try getToken with explicit salt matching our encode
  return getToken({ req, secret, salt: cookieName, cookieName });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes
  if (
    path === "/login" ||
    path === "/register" ||
    path.startsWith("/api/auth") ||
    path === "/api/register" ||
    path === "/api/login"
  ) {
    // If already logged in, redirect to dashboard (except API routes)
    if (!path.startsWith("/api")) {
      const token = await getSessionToken(request);
      if (token && !token.banned) {
        const url = request.nextUrl.clone();
        url.pathname = token.approved ? "/dashboard" : "/pending";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  const token = await getSessionToken(request);

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token.banned) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "banned");
    return NextResponse.redirect(url);
  }

  if (!token.approved && path !== "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  if (token.approved && path === "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && token.role !== "owner") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
