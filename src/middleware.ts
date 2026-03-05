import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes
  if (
    path === "/login" ||
    path === "/register" ||
    path.startsWith("/api/auth") ||
    path === "/api/register"
  ) {
    // If already logged in, redirect to dashboard (except API routes)
    if (!path.startsWith("/api")) {
      const token = await getToken({ req: request, secret });
      if (token && !token.banned) {
        const url = request.nextUrl.clone();
        url.pathname = token.approved ? "/dashboard" : "/pending";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });

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
