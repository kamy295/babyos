---
name: babyos-release-check
description: Check BabyOS release readiness, repository state, automated checks, and migration considerations without deploying.
---

# BabyOS release check

1. Read `AGENTS.md`; inspect branch, Git status, pending diff, and release scope. Do not assume the working tree is clean or that every change belongs in the release.
2. Run `npm run build` for the full suite; it already runs tests, lint, the root TypeScript build, and Vite. Do not rerun tests or lint after it passes. If it fails, report the failure and run only a targeted diagnostic needed to isolate it.
3. Review changed migrations for ordering, existing-data effects, transaction and locking implications, and required rollout order. Do not apply them.
4. Identify checks not covered by project scripts, such as separate server type checking or database integration, when relevant.
5. Do not commit, push, tag, deploy, or modify external systems unless explicitly requested.

## Report

Give readiness, branch and working-tree state, exact commands and results, migration prerequisites, and unresolved risks. Distinguish local build success from database validation or deployment.
