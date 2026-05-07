import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { track, EVENTS } from './analytics';

// ── Config ────────────────────────────────────────────────────────────────────
// Get these from app.revenuecat.com → Project → API Keys
const RC_IOS_KEY     = 'appl_REVENUECAT_IOS_KEY_HERE';
const RC_ANDROID_KEY = 'appl_REVENUECAT_ANDROID_KEY_HERE';

// Match entitlement ID you create in RevenueCat dashboard
export const ENTITLEMENT_PRO = 'pro';

// ── Setup (call once at app start, after onboarding) ─────────────────────────
export function configureRevenueCat(userId?: string) {
  const key = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (key.includes('HERE')) return; // skip until keys are set
  Purchases.configure({ apiKey: key, appUserID: userId });
}

// ── Check entitlement ─────────────────────────────────────────────────────────
export async function isPremium(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch {
    return false;
  }
}

// ── 7-day trial window (local fallback before RC loads) ──────────────────────
export function isInTrialWindow(onboardingDate: string | null): boolean {
  if (!onboardingDate) return true;
  const enrolled = new Date(onboardingDate).getTime();
  const daysSince = (Date.now() - enrolled) / (1000 * 60 * 60 * 24);
  return daysSince <= 7;
}

// ── Fetch available packages ──────────────────────────────────────────────────
export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

// ── Purchase ──────────────────────────────────────────────────────────────────
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  track(EVENTS.PURCHASE_STARTED, { packageId: pkg.identifier });
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    if (active) track(EVENTS.PURCHASE_COMPLETED, { packageId: pkg.identifier });
    return active;
  } catch (e: any) {
    if (!e.userCancelled) track(EVENTS.PURCHASE_FAILED, { error: e.message });
    return false;
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch {
    return false;
  }
}
