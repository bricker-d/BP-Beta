/**
 * WebAuthn utilities — local biometric lock (Face ID, Touch ID, Windows Hello)
 *
 * This is a LOCAL authenticator pattern: the platform biometric (OS-level)
 * verifies the user. No server-side signature verification needed — if the
 * browser returns a credential, the OS already confirmed identity.
 */

const CREDENTIAL_KEY = "bp_biometric_credential";
const SESSION_KEY    = "bp_biometric_session";

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "credentials" in navigator &&
    typeof PublicKeyCredential !== "undefined";
}

export function isBiometricEnrolled(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(CREDENTIAL_KEY);
}

export function isBiometricSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setBiometricSessionActive() {
  if (typeof window !== "undefined") sessionStorage.setItem(SESSION_KEY, "1");
}

export function clearBiometricEnrollment() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CREDENTIAL_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

/** Register a new biometric credential (Face ID / Touch ID / etc.) */
export async function enrollBiometric(displayName: string): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32)) as unknown as ArrayBuffer;
    const userId    = crypto.getRandomValues(new Uint8Array(16)) as unknown as ArrayBuffer;

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "BioPrecision",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: displayName,
          displayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7  }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) return false;

    localStorage.setItem(CREDENTIAL_KEY, b64url(credential.rawId));
    setBiometricSessionActive();
    return true;
  } catch {
    return false;
  }
}

/** Challenge the enrolled credential — returns true if biometric passes */
export async function verifyBiometric(): Promise<boolean> {
  if (!isBiometricSupported() || !isBiometricEnrolled()) return false;
  try {
    const credentialId = localStorage.getItem(CREDENTIAL_KEY)!;
    const challenge    = crypto.getRandomValues(new Uint8Array(32)) as unknown as ArrayBuffer;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          type: "public-key",
          id: fromB64url(credentialId).buffer as ArrayBuffer,
          transports: ["internal"],
        }],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) return false;
    setBiometricSessionActive();
    return true;
  } catch {
    return false;
  }
}
