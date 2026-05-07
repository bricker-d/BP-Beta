import PostHog from 'posthog-react-native';

// ── Config ────────────────────────────────────────────────────────────────────
// Get this from app.posthog.com → Project Settings → API Key
const POSTHOG_KEY = 'POSTHOG_KEY_HERE';
const POSTHOG_HOST = 'https://us.i.posthog.com';

// ── Client (lazy singleton) ───────────────────────────────────────────────────
let _client: PostHog | null = null;

export function getPostHog(): PostHog {
  if (!_client) {
    _client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  }
  return _client;
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export function track(event: string, properties?: Record<string, any>) {
  if (POSTHOG_KEY === 'POSTHOG_KEY_HERE') return; // skip until key is set
  getPostHog().capture(event, properties);
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (POSTHOG_KEY === 'POSTHOG_KEY_HERE') return;
  getPostHog().identify(userId, traits);
}

// ── Event constants ───────────────────────────────────────────────────────────
export const EVENTS = {
  ONBOARDING_STARTED:    'onboarding_started',
  ONBOARDING_COMPLETED:  'onboarding_completed',
  LAB_UPLOADED:          'lab_uploaded',
  ACTION_COMPLETED:      'action_completed',
  ACTION_UNCOMPLETED:    'action_uncompleted',
  FEEDBACK_SUBMITTED:    'feedback_submitted',
  CHECK_IN_SUBMITTED:    'check_in_submitted',
  CHECK_IN_SKIPPED:      'check_in_skipped',
  COACH_MESSAGE_SENT:    'coach_message_sent',
  STREAK_MILESTONE:      'streak_milestone',
  PROFILE_VIEWED:        'profile_viewed',
  PAYWALL_SHOWN:         'paywall_shown',
  PURCHASE_STARTED:      'purchase_started',
  PURCHASE_COMPLETED:    'purchase_completed',
  PURCHASE_FAILED:       'purchase_failed',
} as const;
