# SkinLytix Platform Overview (Client-Facing)

Document date: March 3, 2026  
Audience: Client, partners, stakeholders  
Purpose: Clear summary of what is live today and how each system works together.

## 1) What SkinLytix Delivers Today

SkinLytix is a web platform that combines AI analysis, human review, and subscription tools to help users make better skincare decisions.

The live platform includes:
- Consumer product analysis and ingredient insights.
- Personalized user context and account profiles.
- Paid subscription flows and account billing controls.
- Waitlist conversion system with special pricing.
- Kiosk mode for in-person demos and lead capture.
- Reviewer and moderator workflows for quality control.
- Admin controls, audit logging, and operational analytics.

## 2) User Experience Systems

### Account and Access
- Secure sign-in and account management.
- Password reset and session handling.
- Profile setup and preference capture.

### Product Analysis
- Ingredient extraction and product analysis.
- Ingredient-level explanations and risk framing.
- Personalized result presentation.
- Saved analysis history for returning users.

### Compare, Favorites, and Routine
- Product comparison workflows.
- Saved product/dupe tracking.
- Routine creation and optimization support.

### In-App AI Assistant
- Analysis-aware chat support inside the platform.

## 3) Revenue and Billing Systems

### Stripe Subscription Stack
- Checkout flow for premium/pro plans.
- Customer billing portal access.
- Subscription state sync and account-tier updates.

### Waitlist Special Pricing
- Waitlist offer management by email.
- Promo-code-based special pricing offers.
- Admin send controls for magic-link campaigns.
- Offer activation tracking from sent to activated.

## 4) Kiosk and In-Person Demo System

### Kiosk Mode
- Dedicated kiosk-friendly app mode for demos.
- Controlled kiosk user behavior and session handling.
- Auto-reset/session privacy protections.

### Session Transfer
- Transfer links from kiosk to personal account flows.
- QR-compatible and magic-link-compatible transfer paths.
- Transfer status and expiration tracking.

### Kiosk Analytics
- Admin visibility into kiosk session activity and conversions.

## 5) Quality Control: Reviewer and Moderator System

### Reviewer System
- Structured ingredient validation workflow.
- Evidence/citation capture and reviewer notes.
- Compatibility and nuance review fields.
- Limited user context visibility for better review quality.

### Moderator Approval Layer
- Dedicated moderation queue and decision actions.
- Approve/reject/revision workflow.
- Moderator feedback and timestamp tracking.
- Reviewer outputs require moderation approval before final trust signals.

### Notification Guardrails
- User-facing reviewer update emails are gated by moderation approval.

## 6) Administrative Control Center

Admin capabilities include:
- Role management (user, reviewer, moderator, admin).
- Reviewer certification and group operations.
- Waitlist campaign controls.
- Kiosk analytics and performance visibility.
- Audit log visibility for administrative actions.

## 7) Role Model (Live)

Current platform roles:
- `user`: standard app usage.
- `reviewer`: reviewer workflow access.
- `moderator`: moderation workflow access.
- `admin`: full system and operations access.

Users with multiple roles can see multiple dashboard entry points.

## 8) Data and Compliance Foundations

The platform currently includes:
- Role-based access controls.
- Supabase row-level security policies.
- Audit trail support for key administrative actions.
- Event logging for workflow and notification events.

## 9) Status of Requested Partnership Enhancements

### Implemented from recent feedback
- Dedicated reviewer role formalization.
- Dedicated moderator approval workflow.
- Nuance and compatibility capture in reviewer flow.
- Reviewer visibility of user skin type context.
- Separated reviewer/moderator/admin operational views.

### Not yet implemented (future scope candidates)
- OOO Organics as a live integrated ingredient source.
- INCI synonym and alias normalization engine.
- Multilingual ingredient name normalization pipeline.
- Human-review-to-model training integration decisions.
- Before/after validation feature set.

## 10) Recommended Next Step

Run a Phase 3 scoping workshop to finalize:
- Source integration priorities.
- Data architecture for nomenclature standardization.
- AI feedback loop strategy.
- Timeline and budget per feature block.
