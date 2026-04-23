import { NextRequest, NextResponse } from "next/server";
import { AUTH_PRESENCE_COOKIE, buildLoginRedirectPath } from "./lib/api/auth/redirect";

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.get(AUTH_PRESENCE_COOKIE)?.value === "1";
}

export function proxy(request: NextRequest) {
  if (hasAuthCookie(request)) {
    return NextResponse.next();
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginPath = buildLoginRedirectPath(nextPath, "/auth/login");

  return NextResponse.redirect(new URL(loginPath, request.url));
}

export const config = {
  matcher: ["/", "/organization/:path*", "/settings/:path*", "/trash/:path*"],
};