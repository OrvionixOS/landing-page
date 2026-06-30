import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/brand", "/listings", "/settings", "/onboarding"];
const AUTH_PREFIXES = ["/auth"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth?.user);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !isAuthed) {
    const signInUrl = new URL("/auth/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/brand/:path*",
    "/listings/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/auth/:path*",
  ],
};
