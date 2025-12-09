# Stripe Integration Technical Documentation

## Overview

SkinLytix uses Stripe for subscription billing with a freemium model. This document covers the technical implementation of the payment system.

## Stripe Products & Prices

| Product | Price ID | Amount | Interval |
|---------|----------|--------|----------|
| SkinLytix Premium Monthly | `price_1ScXKURVBtzyxfn0XLp1QfCr` | $7.99 | month |
| SkinLytix Premium Annual | `price_1ScXKyRVBtzyxfn0V0g7e97r` | $79.00 | year |
| SkinLytix Pro Monthly | `price_1ScXLqRVBtzyxfn09S325eaE` | $14.99 | month |
| SkinLytix Pro Annual | `price_1ScXM5RVBtzyxfn0ZoRS6LY5` | $149.00 | year |

## Product IDs to Tier Mapping

```typescript
const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_TZghkTCDHsjAqJ": "premium", // Premium Monthly
  "prod_TZgiGNp4W1ccnO": "premium", // Premium Annual
  "prod_TZgjKC3Q3DYkxS": "pro",     // Pro Monthly
  "prod_TZgj7llSyoZAuJ": "pro",     // Pro Annual
};
```

## Edge Functions

### 1. create-checkout

**Purpose:** Creates a Stripe Checkout session for subscription upgrades.

**Endpoint:** `POST /functions/v1/create-checkout`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "plan": "premium" | "pro",
  "billingCycle": "monthly" | "annual"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Flow:**
1. Validates user authentication
2. Resolves correct price ID from plan + billingCycle
3. Checks for existing Stripe customer
4. Creates Checkout session with subscription mode
5. Returns checkout URL for redirect

### 2. check-subscription

**Purpose:** Verifies subscription status by querying Stripe and syncs to database.

**Endpoint:** `POST /functions/v1/check-subscription`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "subscribed": true,
  "tier": "premium" | "pro" | "free",
  "subscription_end": "2025-01-15T00:00:00.000Z"
}
```

**Flow:**
1. Authenticates user
2. Looks up Stripe customer by email
3. Queries active subscriptions
4. Maps product ID to tier
5. Updates `profiles` table with subscription info
6. Returns current subscription state

### 3. customer-portal

**Purpose:** Creates a Stripe Customer Portal session for billing management.

**Endpoint:** `POST /functions/v1/customer-portal`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Prerequisites:**
- User must have an existing Stripe customer record
- Stripe Customer Portal must be configured in Stripe Dashboard

## Frontend Integration

### PaywallModal Component

Located at `src/components/paywall/PaywallModal.tsx`

- Displays upgrade options with plan selection (Premium/Pro)
- Billing cycle toggle (Monthly/Annual with 17% savings)
- Social proof messaging
- Invokes `create-checkout` and redirects to Stripe

### SubscriptionSection Component

Located at `src/components/subscription/SubscriptionSection.tsx`

- Shows current tier with badge
- Trial countdown banner
- Usage statistics with progress bars
- Feature comparison
- Upgrade and Manage Billing buttons

### useSubscription Hook

Located at `src/hooks/useSubscription.ts`

Key functions:
- `effectiveTier`: Returns actual tier considering admin bypass, demo mode, and trial
- `canAccess(feature)`: Checks if user can access a specific feature
- `isInTrial`: Boolean indicating active trial status
- `trialEndsAt`: Trial expiration date

### useUsageLimits Hook

Located at `src/hooks/useUsageLimits.ts`

Tracks monthly usage against tier limits:
- Chat messages
- Routine optimizations
- Product comparisons
- PDF exports

## Database Schema

### profiles table columns (subscription-related)

| Column | Type | Description |
|--------|------|-------------|
| `subscription_tier` | enum | 'free', 'premium', 'pro' |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Active subscription ID |
| `trial_started_at` | timestamp | Trial start date |
| `trial_ends_at` | timestamp | Trial expiration date |
| `demo_mode_tier` | enum | Admin demo mode override |

### usage_limits table

Tracks monthly usage per user with `period_start` for monthly resets.

## Trial System

New users automatically receive a 7-day Premium trial:

```sql
-- Triggered on auth.users insert
trial_started_at = NOW()
trial_ends_at = NOW() + INTERVAL '7 days'
```

The `useSubscription` hook treats trial users as Premium for feature access.

## Security Considerations

1. **STRIPE_SECRET_KEY** is stored securely in Supabase Secrets
2. All Stripe functions require JWT authentication
3. Customer lookup uses authenticated user's email
4. Subscription sync updates are validated against Stripe data

## Testing

### Test Mode

Use Stripe test mode with `sk_test_*` key for development.

### Test Cards

| Card | Behavior |
|------|----------|
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0341 | Attaches but fails payment |
| 4000 0000 0000 9995 | Declined |

### Admin Bypass

Admin users (via `user_roles` table) automatically have Pro access and can toggle demo mode to simulate different tiers.

## Monitoring

Check edge function logs for debugging:
- `[CREATE-CHECKOUT]` prefix for checkout errors
- `[CHECK-SUBSCRIPTION]` prefix for sync issues
- `[CUSTOMER-PORTAL]` prefix for portal errors

## Stripe Dashboard Configuration

Required setup in Stripe Dashboard:

1. **Customer Portal** - Enable at Settings > Billing > Customer Portal
2. **Webhooks** (optional) - For real-time subscription updates
3. **Products** - Created automatically via Lovable tools
