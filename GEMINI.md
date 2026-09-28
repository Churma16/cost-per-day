# Worthwhile Repository Instructions

This file is the canonical source for Worthwhile-specific engineering rules.

Higher-level AI workflow instructions may be supplied by an external engineering handbook. Those workflow rules should reference this file instead of duplicating project decisions.

## Product Direction

Worthwhile helps people understand what purchases mean across ownership time.

The product should feel calm, reflective, mature, and evidence-based.

- Reframe value through ownership time, history, planning, and personal context.
- Do not shame, praise, score, or decide whether a user's purchase is good or bad.
- Keep copy useful and non-judgmental.
- Avoid generic dashboard language when a Worthwhile-specific explanation is clearer.

## Current Architecture

Treat the repository itself as authoritative if implementation details change.

- Frontend: React with Vite.
- Client server-state and cache: React Query.
- Backend: Go with Gin.
- Database: SQLite.
- Persistence boundaries should follow the repository's existing interfaces and patterns.

### React Query

React Query is the canonical client data-fetching and cache mechanism.

- Do not introduce parallel ad hoc fetching state when the existing query can represent it.
- Keep safe cached data visible during background refetches.
- Distinguish initial load, successful empty data, cached refetch, and cached refetch failure when behavior differs.
- Navigation should not unnecessarily flash back to full loading states when usable cached data already exists.

### SQLite

SQLite is intentional for the current product scale.

Do not introduce MySQL, PostgreSQL, GORM, CQRS, or other infrastructure solely for hypothetical future scale. Require a concrete issue or demonstrated need.

Beta status does not make persisted data disposable. Schema changes, migrations, authentication changes, and public or deployed contracts still require safe handling.

## Categories

Category presentation must use stored category metadata.

Do not infer categories from item names using keywords, regex, or decorative guessing. When metadata is absent, use the repository's generic or uncategorized behavior.

## UI and Copy

- Reuse shared tokens, components, state treatments, and interaction patterns before adding page-specific variants.
- Keep a coherent accent system across navigation and content.
- Preserve required destructive actions while making their consequences clear.
- User-facing copy must go through the existing i18n system when the surface supports localization.
- Prefer stable, human-readable recovery copy over raw backend or transport errors.
- Respect reduced-motion behavior for motion introduced by a change.

## Scope Discipline

Implement the linked issue, not speculative future requirements.

- Do not reintroduce architecture already simplified by the repository.
- Do not block work for UI or architecture explicitly deferred to another issue.
- Distinguish real correctness, persistence, migration, accessibility, or data-integrity risk from optional cleanup.
- Preserve existing behavior outside the requested scope unless a change is required for correctness.

## Verification

For changed behavior:

- add or update regression coverage,
- exercise relevant failure and recovery paths,
- preserve guest and authenticated behavior where both are affected,
- run targeted tests first,
- run the broader applicable frontend or backend checks before sign-off.

The linked issue acceptance criteria and the current repository implementation are the source of truth for what a change must satisfy.
