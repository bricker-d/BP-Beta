import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /clinician routes except /clinician/login
  if (pathname.startsWith("/clinician") && pathname !== "/clinician/login") {
    const session = req.cookies.get("bp_clinician_session");

    if (!session || session.value !== "authenticated") {
      const loginUrl = new URL("/clinician/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clinician/:path*"],
};
