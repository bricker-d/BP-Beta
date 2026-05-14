"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Email/password auth has been removed. All users start via onboarding.
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/onboarding"); }, [router]);
  return null;
}
