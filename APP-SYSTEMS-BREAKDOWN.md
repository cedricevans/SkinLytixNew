# SkinLytix As-Built Systems Breakdown

Document date: March 3, 2026  
Purpose: Plain-language inventory of what the current SkinLytix app can do across all implemented systems.

## 1) Platform Overview

SkinLytix is a web platform for consumer skincare analysis with:
- Product/ingredient analysis workflows.
- Personalized user context (skin type, concerns, sensitivities).
- Subscription and billing controls.
- Waitlist special pricing campaigns.
- Kiosk/demo mode with session transfer.
- Reviewer + moderator + admin operational workflows.
- Analytics, audit logging, and event tracking.

Core stack:
- Frontend: React + Vite + TypeScript.
- Backend: Supabase (Postgres, Auth, RLS, Edge Functions).
- Billing: Stripe.
- Email: Brevo (and Supabase auth email flows where applicable).

## 2) Role Model (Current)

Application roles:
- `user`: standard customer app access.
- `reviewer`: reviewer workflow access.
- `moderator`: moderation workflow access.
- `admin`: full system/admin access.

Role-aware dashboards:
- Reviewer dashboard: `/dashboard/reviewer`
- Moderation dashboard: `/moderation`
- Admin dashboard: `/admin`

Multi-role behavior:
- Users with multiple roles can see multiple dashboard entries in navigation.

## 3) Customer-Facing Product Systems

### 3.1 Authentication and Account
- Sign in/up and password reset flows.
- Session persistence and guarded app routes.
- Profile completion and preference capture.
- Kiosk account lock behavior for kiosk-only account restrictions.

### 3.2 Product Ingestion and Analysis
- Ingredient extraction from user product input.
- Product analysis engine with ingredient categorization and risk framing.
- EpiQ scoring/match presentation.
- Ingredient-level explanation generation.
- User analysis history storage (`user_analyses`).

### 3.3 Ingredient Data and Reference Layer
- PubChem query and caching pipeline.
- Open Beauty Facts query support.
- Reviewer evidence/citation support for PubMed, PubChem, CIR, and related source types.
- Quick-reference links in reviewer source panel (including EWG as reference link only).

### 3.4 Compare, Favorites, and Routine Systems
- Product comparison flow.
- Saved favorites/dupes handling.
- Routine builder and routine optimization flow.
- Routine products and optimization records.

### 3.5 In-App Chat
- Contextual chat experience around analyses.
- Conversation and message persistence.

### 3.6 Settings and Subscription UX
- Subscription status visibility.
- Upgrade/downgrade entry points.
- Customer portal access and subscription sync behaviors.

## 4) Billing and Subscription Systems

Stripe-backed systems:
- Checkout session creation.
- Customer portal session creation.
- Subscription status reconciliation/sync.
- Subscription tier updates in profile.

Additional controls:
- Kiosk account billing restrictions in function logic.
- Site URL/origin handling for checkout and return URLs.

## 5) Waitlist Special Pricing System

Implemented capabilities:
- Waitlist identity table and waitlist-special-pricing offer table.
- Promo code issuance and status tracking.
- Batch/single waitlist magic-link send tooling (admin).
- Auto-link waitlist offers to authenticated accounts by matching email.
- Activation status tracking (`pending`, `sent`, `activated`, etc.).
- Waitlister badge support.

Admin operations:
- Waitlist campaign management UI in Admin dashboard.
- Ability to send links, track sent status, and inspect linkage status.

## 6) Kiosk Mode System

Implemented capabilities:
- Dedicated kiosk mode UI route (`/kiosk`) and kiosk-friendly behavior.
- Kiosk account flow (`kiosk@skinlytix.com`) support in system logic.
- Session transfer model using secure transfer tokens.
- Claim flow route (`/kiosk/claim?token=...`).
- Transfer session and transfer item persistence:
  - `kiosk_transfer_sessions`
  - `kiosk_transfer_items`
- Expiry windows and transfer states (`created`, `magic_link_sent`, `claimed`, `expired`, `cancelled`).
- Kiosk analytics views in admin.

Transfer implementation paths:
- QR code-compatible claim URLs.
- Magic-link-compatible claim URLs.

## 7) Reviewer Workflow System

Reviewer flow includes a structured multi-step validation process:
- Observation step (AI claim context + ingredient context).
- Evidence/citation entry.
- Public explanation drafting.
- Confidence assessment.
- Verdict selection.
- Internal notes.

Additional reviewer data capture now implemented:
- Nuance flags.
- Compatibility assessment.
- Compatibility notes.
- Limited user context visibility (skin type only).

Data model support:
- `ingredient_validations`
- `ingredient_validation_citations`
- reviewer queue views and related helper RPC/views

## 8) Moderation Workflow System

Implemented moderation controls:
- Dedicated moderation queue UI (`ModerationDashboard`).
- Review decisions: `approved`, `rejected`, `needs_revision`, `pending`.
- Moderator feedback capture.
- Moderation timestamps and reviewer attribution fields.
- Trigger-based enforcement to prevent non-privileged self-approval.

Email gating behavior:
- Review update email sends only after moderation approval.
- Pending items are skipped with explicit event logging reason.

## 9) Admin System

Admin dashboard capabilities include:
- User role management.
- Certification management.
- Reviewer group management.
- Audit log access.
- Waitlist campaign management.
- Kiosk analytics.
- Moderation queue access (admin can also moderate).

Security hardening:
- Role assignment function now requires authenticated, authorized caller.
- Bootstrap admin email allowlist support for first-time admin bootstrap.

## 10) Edge Function Catalog (Current)

- `add-user-role`: assign role to user with authz checks.
- `analyze-product`: core product analysis pipeline.
- `chat-skinlytix`: chat backend for analysis context.
- `check-brevo-email-status`: Brevo delivery/status checks.
- `check-subscription`: sync user subscription state from Stripe.
- `claim-kiosk-transfer`: claim kiosk transfer session.
- `create-checkout`: create Stripe checkout session.
- `create-kiosk-transfer`: create kiosk transfer token/session.
- `customer-portal`: create Stripe customer portal session.
- `delete-analysis`: authenticated deletion of analysis data.
- `explain-ingredients`: ingredient explanation generation support.
- `export-data`: platform-level export helper.
- `export-user-analyses`: export user analyses set.
- `extract-ingredients`: ingredient extraction utility.
- `find-dupes`: dupe-finding logic with optimization.
- `optimize-routine`: routine optimization generator.
- `query-open-beauty-facts`: OBF data query + safeguards.
- `query-pubchem`: PubChem query + cache + safeguards.
- `send-review-update-email`: reviewer update email with moderation gate.
- `send-waitlist-magic-links`: waitlist magic-link campaign sender.

## 11) Database Systems (Major Domains)

Identity and access:
- `profiles`
- `user_roles`
- `user_badges`

Core product intelligence:
- `user_analyses`
- `ingredient_cache`
- `product_cache`

Reviewer/moderation:
- `ingredient_validations`
- `ingredient_validation_citations`
- `student_certifications`
- `reviewer_groups`
- `reviewer_group_members`
- `audit_logs`

Customer experience:
- `routines`
- `routine_products`
- `routine_optimizations`
- `saved_dupes`
- `market_dupe_cache`

Growth and lifecycle:
- `waitlist`
- `waitlist_special_pricing`
- `kiosk_transfer_sessions`
- `kiosk_transfer_items`

Telemetry and feedback:
- `user_events`
- `feedback`
- `beta_feedback`

## 12) Security and Controls

Implemented safeguards:
- Supabase auth-protected routes.
- Role-aware access checks in UI and backend.
- RLS policies on sensitive tables.
- Trigger-level enforcement for moderation workflow integrity.
- Audit logging for admin role actions.
- CORS handling and token checks in edge functions.

## 13) What Is Implemented vs Pending

Implemented from recent partnership feedback:
- Moderator approval layer before reviewer output is finalized.
- Dedicated reviewer role and workflow formalization.
- Nuance flagging fields.
- Compatibility assessment fields.
- Reviewer visibility of user skin type (limited context only).
- Separate reviewer/moderator/admin dashboard surfaces.

Not implemented yet (future scope / Phase 3 candidates):
- OOO Organics as integrated source pipeline.
- INCI canonicalization + synonym/alias engine.
- Multilingual ingredient normalization/NLP mapping.
- Human-review-to-model training pipeline decisions/integration.
- Before/after product validation feature.

## 14) Operating Notes

To keep this document accurate over time:
- Update it whenever new edge functions are added.
- Update role matrix whenever access rules change.
- Update integrations section when any external data source becomes pipeline-integrated.
