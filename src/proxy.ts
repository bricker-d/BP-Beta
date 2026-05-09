import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require a patient session
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/callback",
  "/clinician/login",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Clinician cookie auth (unchanged) ──────────────────────────────────────
  if (pathname.startsWith("/clinician") && pathname !== "/clinician/login") {
    const session = req.cookies.get("bp_clinician_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.redirect(new URL("/clinician/login", req.url));
    }
    return NextResponse.next();
  }

  // ── Public paths — always allow ────────────────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── API routes — skip auth check (handled per-route) ──────────────────────
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Patient routes — require Supabase session ──────────────────────────────
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
