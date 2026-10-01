# JOBA24 MULTI-BRAND — RESTORE RUNBOOK & ROLLBACK POLICY

> Living document. **Every implementation package, migration and phase MUST be recorded here before it is deployed.**
> Purpose: allow any developer to restore the system to a verified state **without relying on memory**.

---

# PART 1 — ROLLBACK POLICY (NON-NEGOTIABLE)

Applies to Implementation #1 and to **every** future implementation package, migration and phase.

## 1. Core principle — always preserve a safe way back

Joba24 is a live production system. At every stage we must be able to return to the last verified working state if an unexpected bug, regression, auth failure, feed change, data-isolation failure, security issue or migration surprise appears.

**The Multi-Brand project must never put us in a position where continuing forward is the only option.**
There must always be a documented and tested path back.

## 2. Last Known Good State (LKGS)

Before **every** implementation package, capture and record:

- code / repository version
- schemas, entities
- relevant configuration, RLS / security rules
- functions affected
- database state / counts
- feature flags and runtime configuration
- Golden Joba24 Regression Suite results
- feed / query baselines
- migration state

Goal: know exactly *"what did Joba24 look like immediately before this implementation?"*

## 3. Every change must have a rollback plan BEFORE it is made

Before implementing, provide:

| | |
|---|---|
| **A** | What will change |
| **B** | What existing files / entities / data can be affected |
| **C** | Exact rollback procedure |
| **D** | Does rollback change code only, schema, configuration or data? |
| **E** | Could any data be lost during rollback? |
| **F** | Can rollback run while production stays online? |
| **G** | Estimated rollback complexity |
| **H** | Verification steps after rollback |

**If a safe rollback cannot be designed: DO NOT IMPLEMENT. Report the blocker first.**

## 4. Prefer reversible / additive changes

```
ADDITIVE FIRST  →  BACKFILL SECOND  →  VERIFY  →  SWITCH LATER  →  REMOVE LEGACY MUCH LATER
```

Prefer: new nullable fields · new entities · adapters · feature flags · shadow reads · compatibility layers · versioned configuration · reversible migrations.

Avoid early: deleting/renaming fields · deleting entities · replacing existing data · destructive or irreversible migrations · removing legacy code paths · unnecessary edits to historical records.

The existing Joba24 path stays available until the replacement has proven parity.

## 5. Do not delete legacy implementation early

When a new Brand-aware implementation replaces a Joba24 subsystem:

```
Legacy Joba24 path + New Brand-aware path
   → shadow comparison → parity verification
   → feature flag / controlled adoption → monitoring
   → only much later, consider legacy removal
```

This is what allows switching Joba24 back if necessary.

## 6. Feature flags / kill switches

Every major Multi-Brand subsystem should have a safe kill switch:

brand-aware feed · Distribution Engine · Brand Runtime · brand-specific categories · Partner Admin · brand notifications · brand commercial logic · brand-specific features.

If a new subsystem causes a production issue we must be able to disable it and return Joba24 to legacy/default behaviour **without emergency code surgery**. Do not add unnecessary complexity for trivial schema-only changes.

## 7. Data migration safety

No production data migration without: pre-migration counts · backup/recovery strategy · idempotent migration where possible · resumable batches where possible · reconciliation · post-migration counts · validation · rollback/reversal strategy.

The migration must record enough information to **safely reverse** the change. Never overwrite historical information without preserving the ability to reconstruct the previous state.

## 8. Never use DELETE as the only rollback for live business data

Distinguish:

- **TECHNICAL ROLLBACK** — revert code / configuration / schema behaviour.
- **DATA PRESERVATION** — retain valid historical marketplace records.

Early phases may remove newly added *unused* entities/fields safely. Once real brands/users/tasks/applications/payments exist, rollback must **not** blindly delete business data. Prefer: disable · suspend · feature flag OFF · route Joba24 back to legacy behaviour — never delete Tasks, Applications, Chats, Reviews, Payments or historical records.

## 9. Database / schema rollback

For every schema change document: previous schema · new schema · exact diff · rollback schema · whether new data can exist in the added fields/entity · what happens to that data during rollback.

**Do not remove a newly introduced field/entity if doing so would destroy valid production data.** In that case: disable its use → restore legacy behaviour → preserve the data → design a separate cleanup procedure later.

## 10. Security / RLS rollback

Phase 3 is especially sensitive. Every RLS/security change must be **entity-by-entity, independently deployable, testable and reversible.** Never deploy RLS changes to all entities as one irreversible package.

Per entity: `baseline → change → authorization tests → Joba24 regression tests → monitoring → approve next entity.`
If users lose legitimate access: **roll back that entity's rule immediately.**

Security rollback must never mean intentionally reopening known cross-brand access after external brands are live. Before Brand #2 goes live, the target authorization model must be proven safe.

## 11. Restore runbook

This document. For every completed package record: package/version · date · files changed · schemas changed · data migrated · configuration changed · feature flags · verification result · rollback procedure · rollback dependencies · last known good version · known limitations.

## 12. Rollback verification

A rollback is **not** successful merely because deployment succeeded. After any rollback, rerun the relevant Golden Joba24 Regression Suite (full suite for a major rollback).

**Success condition: Joba24 behaviour matches the Last Known Good State.**

## 13. Multi-brand must never become required for legacy Joba24 too early

During migration, avoid architecture where Joba24 immediately depends on every new Brand subsystem. Until a subsystem is proven, Joba24 keeps a safe legacy/default path.

**Long-term architecture = Multi-Brand. Migration strategy = controlled coexistence.** This distinction is mandatory.

## 14. Emergency priority

1. Protect and restore Joba24.
2. Preserve data integrity.
3. Investigate the Multi-Brand issue.

Do not attempt multiple speculative fixes on production when a known safe rollback is available.

## 15. Implementation #1 specific requirement

Because **no backfill and no runtime usage** are approved in Implementation #1, rollback is simple and lossless:

1. Remove the newly added unused Brand foundation safely.
2. Revert `Task` schema to its exact previous definition.
3. Revert `TaskApplication` schema to its exact previous definition.
4. Restore the previous repository/configuration version.
5. Verify no production records were unintentionally changed.
6. Rerun the Golden Joba24 Regression Suite.
7. Confirm Joba24 matches the pre-change baseline.

---

# PART 2 — PACKAGE RECORDS

## Package #1 — Safe Brand Foundation ✅ DEPLOYED

| | |
|---|---|
| **Date** | 2026-10-01 |
| **Phase** | 1 (Safe Brand Foundation) |
| **Status** | Deployed |
| **Last Known Good State** | see §LKGS-1 |

### Files changed

| File | Change |
|---|---|
| `base44/entities/Brand.jsonc` | **NEW** entity (slug, name, status, origin, is_default) + RLS (read public / write admin) |
| `base44/entities/Task.jsonc` | **+1 nullable field** `origin_brand_id` (appended; all 64 original properties byte-identical) |
| `base44/entities/TaskApplication.jsonc` | **+1 nullable field** `surface_brand_id` (appended; all 12 original properties byte-identical) |
| `src/lib/brandResolver.js` | **NEW** pure module — **not imported anywhere** (dead code until Phase 6) |
| `docs/MULTIBRAND_RESTORE_RUNBOOK.md` | **NEW** this document |

### Schemas changed
Two existing entities gained one nullable field each. **No field removed, renamed, retyped or re-required.** `required` arrays unchanged.

### Data migrated
**NONE.** No backfill, no update, no delete. Existing Task/TaskApplication records were not touched.

### Configuration / feature flags changed
**NONE.**

### Behaviour change
**NONE INTENDED.** No read path, feed, auth, notification, category or native behaviour depends on the new entity or fields.

### Verification result
- Entity JSON validates (Task 65 properties, TaskApplication 13 properties).
- All original property keys preserved in order; new key appended last.
- `required` arrays unchanged.
- Baseline counts unchanged: **272 Tasks**, **123 TaskApplications**.
- No source file references `origin_brand_id`, `surface_brand_id`, `brandResolver` or the `Brand` entity.
- Build passes.

### Rollback procedure
1. Delete `base44/entities/Brand.jsonc`.
2. Delete the seeded `Brand` record (`slug: 'joba24'`) — **not business data; no Tasks/Applications/Payments involved.**
3. Remove `origin_brand_id` from `base44/entities/Task.jsonc`.
4. Remove `surface_brand_id` from `base44/entities/TaskApplication.jsonc`.
5. Delete `src/lib/brandResolver.js`.
6. Restore the repository to the pre-change commit.

### Rollback dependencies
None. No other package depends on Package #1. No runtime path reads the new fields.

### Rollback complexity
**LOW.** Code + schema only. No data migration to reverse.

### Data loss risk on rollback
**NONE.** The only record created is the Brand seed, which is intentional configuration (not marketplace data). The two new fields are null on every record.

### Online rollback
Yes — no downtime required.

### Known limitations
- `Brand` entity is inert: nothing reads it.
- `brandResolver.js` is dead code.
- `origin_brand_id` / `surface_brand_id` are null on all existing records (backfill is Phase 2, not yet approved).
- Brand `slug` immutability is a policy, not yet enforced (RLS cannot enforce field-level immutability).

---

# PART 3 — LAST KNOWN GOOD STATE REGISTRY

## LKGS-1 — pre-Package #1

| | |
|---|---|
| **Captured** | 2026-10-01, before Package #1 |
| **Entities** | 20 (Brand did not exist) |
| **Task schema** | 64 properties, `required: ["title","price"]` |
| **TaskApplication schema** | 12 properties, `required: ["task_id","worker_id"]` |
| **Task records** | 272 |
| **TaskApplication records** | 123 |
| **Fields `origin_brand_id` / `surface_brand_id`** | did not exist on any record |
| **Brand entity** | did not exist |
| **RLS coverage** | 4/20 entities (`Review`, `WorkerStat`, `DemoUser`, `OAuthHandshake`) |
| **Functions** | 65 (62 use `asServiceRole`; 26 have no auth check) |
| **Golden Suite** | baseline to be recorded (Phase 0) |

**To restore to LKGS-1:** perform the Package #1 rollback procedure above.

---

# PART 4 — TEMPLATE FOR FUTURE PACKAGES

Copy for every new package:

```
## Package #N — <name>
Date / Phase / Status:
LKGS reference:

### Change plan (before implementation)
A. What will change:
B. Files/entities/data affected:
C. Exact rollback procedure:
D. Rollback changes (code/schema/config/data):
E. Data loss risk on rollback:
F. Online rollback possible:
G. Rollback complexity:
H. Verification steps after rollback:

### Record (after implementation)
Files changed:
Schemas changed:
Data migrated:
Configuration changed:
Feature flags:
Verification result:
Rollback dependencies:
Known limitations:
```

**Gate: no package is deployed until section 3 (A–H) is complete.**