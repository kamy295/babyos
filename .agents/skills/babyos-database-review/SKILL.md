---
name: babyos-database-review
description: Inspect BabyOS PostgreSQL schema, migrations, database functions, grants, and data integrity. Use for database design or migration reviews.
---

# BabyOS database review

1. Read `AGENTS.md`, inspect Git status, and review relevant migrations, repositories, routes, and tests together.
2. Trace tables, keys, constraints, indexes, functions, grants, and RLS policies from actual SQL. Do not infer live database state from repository files.
3. Evaluate existing-data compatibility, locks, transaction boundaries, concurrency, recovery, and application compatibility.
4. Treat live database access as out of scope unless explicitly authorized. Never run a migration or modify data during a review.
5. Separate verified schema/code facts from assumptions and unverified live state.

## Report

Summarize data flow and database objects, then list findings with evidence, failure examples, compatibility effects, options, and a recommendation. Identify proposed files/migrations and validation tests. State whether live state was checked and whether PostgreSQL integration infrastructure exists.
