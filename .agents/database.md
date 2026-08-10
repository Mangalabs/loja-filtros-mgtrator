# ARQUIVO 6

# CAMINHO: <project>/.agents/database.md

# ============================================================

# DATABASE RULES

The backend uses Knex query builder with PostgreSQL.

Do not introduce an ORM unless explicitly requested. Schema changes live in
`backend/database/migrations` as Knex migration files.

# 1. BEFORE DATABASE CHANGES

Before changing database behavior:

1. Inspect the current schema.
2. Inspect related entities and relations.
3. Inspect existing migrations.
4. Inspect related queries.
5. Inspect constraints and indexes when relevant.
6. Identify compatibility risks.
7. Identify potential data-loss risks.

Never assume production data has the same characteristics as local development data.

---

# 2. QUERY RULES

Avoid:

- N+1 queries;
- unnecessary full-table scans;
- unbounded reads;
- unnecessary relation loading;
- avoidable repeated queries;
- retrieving large unused fields.

Do not optimize a query without understanding the access pattern.

---

# 3. TRANSACTIONS

Use transactions when multiple dependent mutations must remain atomic.

Consider:

- rollback behavior;
- uniqueness constraints;
- race conditions;
- concurrent requests;
- partial failures.

Do not introduce a transaction when operations intentionally require independent failure behavior.

---

# 4. MIGRATIONS

Create migrations only when the requested behavior requires schema changes.

Potentially destructive operations include:

- dropping tables;
- dropping columns;
- destructive type conversions;
- removing constraints;
- rewriting identifiers;
- making nullable fields required without data preparation.

Explicitly identify:

- possible data loss;
- deployment-order dependencies;
- backwards-compatibility concerns.

Prefer backward-compatible migration strategies when application and database deployment may happen independently.

---

# 5. PRODUCTION SAFETY

Never create destructive database reset or seed behavior as part of normal production startup.

Never assume existing production records can safely be discarded.

Never perform broad data rewrites unless explicitly required and understood.
