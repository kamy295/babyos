---
name: babyos-feature-implementation
description: Implement a scoped BabyOS feature across frontend, Hono API, repositories, tests, and migrations when needed.
---

# BabyOS feature implementation

1. Read `AGENTS.md`; inspect Git status, branch, feature code, related routes, repositories, types, migrations, and tests before editing.
2. Keep changes within the requested scope. Preserve existing user changes, API contracts, family/baby scoping, and historical data behavior.
3. Validate untrusted input at API boundaries. Keep database operations in repositories and schema changes in ordered migrations when needed.
4. Add focused tests for changed behavior when requested or needed to validate the implementation. Do not claim integration coverage that was not run.
5. Run requested checks and report exact outcomes. Do not commit, push, deploy, or apply migrations to a live database unless explicitly asked.

## Report

Summarize what changed and why, list every changed file, and give exact test/check results. Note migration instructions, compatibility effects, and remaining limitations.
