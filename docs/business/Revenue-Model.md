# SkinLytix Revenue Model & Monetization Strategy

## Executive Summary

SkinLytix uses a **freemium model** with psychology-driven upsells designed to maximize conversion while maintaining user trust. This document outlines our tier structure, pricing, psychology tactics, and implementation approach.

---

## Tier Structure

### Free Tier (Discovery)
**Goal:** Build trust, demonstrate value, create habit

| Feature | Limit | Psychology Principle |
|---------|-------|---------------------|
| Product Analyses | **Unlimited** | Reciprocity - give generously first |
| EpiQ Score | Score only (no breakdown) | Preview Then Lock - show value |
| AI Summary | One-liner only | Curiosity Gap |
| Routines | 1 routine, 3 products max | Endowment Effect |
| SkinLytixGPT Chat | 3 messages/month | Scarcity |
| Routine Optimization | Preview savings only | Loss Aversion |
| Product Comparison | 2 products only | Limitation |

### Premium Tier - $7.99/month ($79/year)
**Goal:** Core power users, routine builders

| Feature | Limit | Upgrade Trigger |
|---------|-------|-----------------|
| Product Analyses | Unlimited | - |
| EpiQ Score | + Sub-score breakdown | Blurred preview |
| AI Explanation | Full analysis | "Unlock insights" |
| Routines | 5 routines, unlimited products | Creation limit hit |
| SkinLytixGPT Chat | 30 messages/month | Counter at 3 |
| Routine Optimization | 3/month (full details) | Locked preview |
| Product Comparison | 5 products | Third product add |
| PDF Export | Clean (no watermark) | Watermarked preview |

### Pro Tier - $14.99/month ($149/year)
**Goal:** Enthusiasts, professionals, influencers

| Feature | Limit |
|---------|-------|
| Everything in Premium | ✓ |
| SkinLytixGPT Chat | Unlimited |
| Routine Optimization | Unlimited |
| Product Comparison | Unlimited |
| Batch Analysis | 10 products at once |
| Priority Support | 24hr response |
| Early Access Features | Beta access |

---

## Psychology Tactics (FOMO & Behavioral Economics)

### 1. Preview Then Lock (Loss Aversion)
Instead of hard gates, show blurred/partial results:
- EpiQ score visible, sub-scores blurred
- Optimization shows "You could save $XX" but details locked
- Creates sense of already owning the value

### 2. Social Proof Triggers
Display on paywall modals:
- "Join 847 users who upgraded this month"
- "Users who optimize routines save avg $25/mo"
- Real-time counter updates

### 3. Urgency & Scarcity
- **First-Week Discount**: 40% off with 7-day countdown
- **Usage Counters**: "2 of 3 free chat messages remaining"
- **Limited Beta**: "Pro features in limited beta"

### 4. Endowment Effect (Free Trial)
- 7-day full Premium trial
- Downgrade experience explicitly shows lost features
- "You'll lose access to: Sub-scores, 30 chat messages, 5 routines..."

### 5. Goal Gradient (Progress)
- "1/3 analyses to unlock your first recommendation"
- Progress bars toward milestones
- Gamification unlocks

### 6. Anchoring (Price Presentation)
- Show annual price first (appears cheaper)
- ~~$9.99~~ **$7.99**/month
- "$0.26/day - less than your morning coffee"

### 7. Reciprocity (Value-First)
- Generous free tier builds trust
- Full EpiQ score given free
- Upgrade feels like unlocking, not paying

### 8. Variable Rewards (Gamification)
- Badges: "Curious Chemist" (10 analyses)
- Streak rewards: "7-day streak! Here's a bonus tip"
- Random bonuses for engagement

---

## Paywall Trigger Points

| Trigger Point | Component | Psychology |
|---------------|-----------|------------|
| Score breakdown tap | BlurredPreview + PaywallModal | Curiosity Gap |
| 4th chat message | UsageCounter + PaywallModal | Scarcity |
| 2nd routine creation | PaywallModal | Endowment |
| Optimization details | BlurredPreview + SocialProof | Loss Aversion |
| 3rd product comparison | PaywallModal | Limitation |
| PDF export | Watermark preview | Value demonstration |
| Batch analysis | Feature locked | Exclusivity |

---

## Revenue Projections

### Assumptions (Conservative)
- Monthly Active Users: 1,000
- Free → Premium conversion: 3%
- Premium → Pro conversion: 1%
- Annual plan preference: 40%

### Monthly Revenue Calculation

| Tier | Users | Monthly Price | Annual Price | Revenue |
|------|-------|--------------|--------------|---------|
| Premium Monthly | 18 | $7.99 | - | $143.82 |
| Premium Annual | 12 | - | $79/12 = $6.58 | $78.96 |
| Pro Monthly | 6 | $14.99 | - | $89.94 |
| Pro Annual | 4 | - | $149/12 = $12.42 | $49.68 |
| **Total MRR** | | | | **$362.40** |

### Stripe Fees
- Payment processing: 2.9% + $0.30 per transaction
- Billing (subscriptions): 0.7% of volume
- Net margin after fees: ~95%

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Database schema (subscription_tier, usage_limits, user_badges)
- [x] Admin bypass system (demo mode toggle)
- [ ] useSubscription hook
- [ ] useUsageLimits hook

### Phase 2: Paywall Components (Week 1-2)
- [ ] PaywallModal with social proof
- [ ] BlurredPreview component
- [ ] UsageCounter component
- [ ] UrgencyBanner component
- [ ] Implement at 8 trigger points

### Phase 3: Stripe Integration (Week 2)
- [ ] Enable Stripe connector
- [ ] Create subscription products
- [ ] Checkout flow with psychology
- [ ] Webhook handlers

### Phase 4: Gamification (Week 3)
- [ ] Badge system
- [ ] Streak tracking
- [ ] Progress visualization

### Phase 5: Trial & Retention (Week 3)
- [ ] 7-day trial flow
- [ ] Downgrade experience
- [ ] Win-back campaigns

---

## Admin & Demo Mode

### Admin Bypass
Users with `admin` role in `user_roles` table get:
- Full Pro access automatically
- Demo mode toggle visible
- Access to /analytics dashboard

### Demo Mode Toggle
Floating UI for admins to simulate user experience:
- Switch between Free/Premium/Pro views
- Perfect for partner demos
- Logs demo sessions for analytics

---

## Metrics to Track

### Conversion Metrics
- Free → Trial conversion rate
- Trial → Paid conversion rate
- Premium → Pro upgrade rate
- Churn rate by tier

### Engagement Metrics
- Features triggering most upgrades
- Time to first upgrade
- Usage before upgrade
- Win-back success rate

### Revenue Metrics
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)

---

## Competitive Positioning

| Feature | SkinLytix Free | Yuka Free | INCI Beauty Free |
|---------|---------------|-----------|------------------|
| Unlimited scans | ✅ | ✅ | ❌ (5/day) |
| AI explanations | ✅ (summary) | ❌ | ❌ |
| Routine building | ✅ (limited) | ❌ | ❌ |
| Personalization | ✅ | ❌ | ✅ |

**Our edge:** Routine intelligence + AI-powered insights at free tier
