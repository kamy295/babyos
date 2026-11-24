---
name: babyos-code-review
description: Review BabyOS code changes for correctness, security, data integrity, and regressions. Use when asked to review a diff or implementation.
---

# BabyOS code review

1. Read `AGENTS.md`, inspect Git status, and identify the exact diff. Preserve unrelated working-tree changes.
2. Trace changed code through callers, API schemas, repositories, frontend types, and relevant tests.
3. Check input validation, error handling, family/baby scoping, concurrency, and compatibility where relevant.
4. Base findings on source and tests; label uncertain or untested behavior.
5. Do not edit files during review unless fixes are requested. Run checks only when requested.

## Report

List actionable findings first, ordered by severity, with file and line references, evidence, and impact. Then state checks performed, coverage gaps, and scope limitations. If there are no findings, say so and note residual risks.
