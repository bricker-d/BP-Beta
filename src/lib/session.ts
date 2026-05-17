import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
export const SESSION_COOKIE = "bp_clinic_session";

export function signClinicId(clinicId: string): string {
  const hmac = createHmac("sha256", SECRET).update(clinicId).digest("hex");
  return `${clinicId}.${hmac}`;
}

export function verifyClinicSession(value: string): string | null {
  const dotIdx = value.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const clinicId = value.slice(0, dotIdx);
  const hmac = value.slice(dotIdx + 1);
  if (!clinicId || !hmac) return null;
  const expected = createHmac("sha256", SECRET).update(clinicId).digest("hex");
  if (expected !== hmac) return null;
  return clinicId;
}
