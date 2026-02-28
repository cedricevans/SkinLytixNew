# Critical Software Patching Procedure

**Document Version:** 1.0  
**Last Updated:** February 28, 2026  
**Owner:** Engineering & Operations Team  
**Status:** Active

---

## Purpose

Define how SkinLytix identifies, prioritizes, tests, and applies security and stability patches to critical software and services.

---

## Scope

This procedure covers:
- Production application code and dependencies
- Infrastructure and managed services (e.g., hosting, database, auth, payments)
- Admin tools and internal services that access production data

It does not cover end‑user device patching (which is managed by users on their own devices).

---

## Roles & Responsibilities

- **Incident Commander (IC):** Owns emergency patch decisions during security incidents.
- **Engineering Lead:** Owns prioritization and scheduling of routine patches.
- **Release Owner:** Runs testing and deployment steps.

If the IC and Engineering Lead are the same person, they assume all responsibilities.

---

## Patch Sources

We monitor the following for patch and vulnerability notices:
- Supabase advisories and service notices
- Vercel advisories and service notices
- Stripe advisories (payment platform)
- Open‑source dependency advisories (npm package ecosystem)

---

## Severity & Target Timelines

| Severity | Definition | Target Remediation |
|---|---|---|
| **Critical** | Active exploit, data exposure, auth bypass, RCE, or confirmed breach | **Within 48 hours** |
| **High** | High‑impact vulnerability without active exploit | **Within 7 days** |
| **Medium** | Moderate impact, limited exposure, or requires complex preconditions | **Within 30 days** |
| **Low** | Minor impact or low likelihood | **Within 90 days** |

---

## Patching Workflow

1. **Detect**
   - Review vendor advisories and dependency alerts.
   - Triage any security‑related tickets or user reports.

2. **Assess**
   - Determine severity and exposure (affected components, data at risk).
   - Decide patch path: immediate hotfix vs. scheduled release.

3. **Plan**
   - Assign a Release Owner.
   - Prepare patch and a rollback plan.
   - Identify tests required for safe release.

4. **Test**
   - Validate patch in staging or a safe test environment.
   - Run core regression checks for affected areas.

5. **Deploy**
   - Deploy using the standard deployment runbook.
   - For Critical items, use the emergency hotfix path.

6. **Verify**
   - Confirm remediation with logs/monitoring.
   - Validate affected user flows.

7. **Document**
   - Record the patch, severity, date/time, and verification steps.
   - Link any related incident report.

---

## Emergency Hotfix Path

For Critical items:
- IC approves the hotfix.
- Engineering Lead runs expedited testing.
- Release Owner deploys immediately.
- Post‑mortem is required within 48 hours.

---

## Recordkeeping

We retain patch records for a minimum of 12 months, including:
- Severity and affected systems
- Date of discovery and resolution
- Validation steps performed
- Link to related incident response if applicable

