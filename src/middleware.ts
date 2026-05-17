import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyClinicSession } from "@/lib/session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/practitioner/login") return NextResponse.next();

  const sessionValue = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionValue) {
    return NextResponse.redirect(new URL("/practitioner/login", req.url));
  }

  const clinicId = verifyClinicSession(sessionValue);
  if (!clinicId) {
    const res = NextResponse.redirect(new URL("/practitioner/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/practitioner/:path*"],
};
