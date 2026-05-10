import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Clinician cookie auth ──────────────────────────────────────────────────
  if (pathname.startsWith("/clinician") && pathname !== "/clinician/login") {
    const session = req.cookies.get("bp_clinician_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.redirect(new URL("/clinician/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clinician/:path*"],
};
