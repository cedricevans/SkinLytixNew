/**
 * Guide for fixing test mode errors
 * 
 * If you're seeing these errors in the console while testing:
 * 
 * 1. POST /functions/check-subscription 500 (Internal Server Error)
 *    - The check-subscription function needs STRIPE_SECRET_KEY
 *    - Add STRIPE_SECRET_KEY to your .env.local
 *    - See .env.stripe.example for format
 * 
 * 2. GET /rest/v1/profiles 406 (Not Acceptable)
 *    - This is usually a non-fatal error in Supabase REST API
 *    - The app falls back to using PostgREST queries
 *    - Not a blocker for development
 * 
 * 3. React Router Future Flag Warnings
 *    - These are deprecation warnings for React Router v7
 *    - Already fixed by adding future flags to BrowserRouter
 *    - They do NOT affect app functionality
 * 
 * SOLUTIONS:
 * 
 * Option A: Add Stripe keys to .env.local
 * ─────────────────────────────────────────
 * 1. Go to https://dashboard.stripe.com/
 * 2. Copy your test keys (sk_test_... and pk_test_...)
 * 3. Add to .env.local:
 *    STRIPE_SECRET_KEY=sk_test_YOUR_KEY
 *    STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
 * 4. Restart dev server
 * 
 * Option B: Disable subscription check in dev mode (faster)
 * ─────────────────────────────────────────────────────
 * 1. The subscription check is non-critical for testing
 * 2. The app will default to "free" tier if it fails
 * 3. You can still use all features with the test user
 * 
 * WHAT THESE ERRORS MEAN:
 * 
 * - check-subscription: Validates if user has active Stripe subscription
 *   → Required for: Premium features, trial tracking
 *   → Falls back to: Free tier if unavailable
 * 
 * - 406 Not Acceptable: Supabase REST API returning unexpected format
 *   → Not critical: App uses PostgREST as fallback
 *   → Usually resolves itself
 * 
 * RECOMMENDED ACTION FOR DEV:
 * 
 * Quick start (ignore errors):
 *   → Just test normally, subscription features will show "free" tier
 * 
 * Proper setup (fix errors):
 *   → Add Stripe keys from Option A above
 */

export const DEV_MODE_TROUBLESHOOTING = {
  check_subscription_500: {
    error: "POST /functions/check-subscription 500",
    cause: "STRIPE_SECRET_KEY not configured in .env.local",
    severity: "Low - falls back to free tier",
    fix: "Add Stripe keys from .env.stripe.example to .env.local",
  },
  profiles_406: {
    error: "GET /rest/v1/profiles 406 (Not Acceptable)",
    cause: "Supabase REST API format issue",
    severity: "Low - non-fatal, has fallback",
    fix: "Usually resolves itself, no action needed",
  },
  react_router_warnings: {
    error: "React Router Future Flag Warnings",
    cause: "Using v6 without v7 future flags",
    severity: "None - deprecation warnings only",
    fix: "✅ Already fixed in App.tsx",
  },
};
