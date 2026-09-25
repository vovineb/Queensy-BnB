import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "qb_session";
const VISITOR_COOKIE = "qb_vid";

/**
 * Edge-of-app request handling:
 * - optimistic redirect to /login for account/admin/checkout pages without a
 *   session cookie (real authorisation happens on the server for every request);
 * - issues a random first-party visitor id for privacy-friendly analytics.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && (pathname.startsWith("/account") || pathname.startsWith("/admin") || pathname.startsWith("/book/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|media/|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|api/realtime).*)"],
};
