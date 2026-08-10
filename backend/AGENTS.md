# ARQUIVO 3

# CAMINHO: <project>/backend/AGENTS.md

# ============================================================

# BACKEND AI ENGINEERING RULES

These rules apply to backend code.

Repository-wide rules from the root `AGENTS.md` remain active.

For significant architecture work, read:

`../.agents/architecture.md`

For database work, read:

`../.agents/database.md`

For security-sensitive work, read:

`../.agents/security.md`

# 1. BACKEND DEPENDENCY FLOW

Established project flow:

`View / Route`
→ `Controller`
→ `Model`

Controllers may also depend on dedicated external Integration modules.

A `Service / Use Case` layer is optional in this repository. Introduce one only
when it removes real complexity, enables meaningful reuse, or matches an
established local pattern. Do not create one-line services merely to satisfy a
generic architecture template.

Circular dependencies are forbidden.

---

# 2. ROUTES / HTTP LAYER

Responsibilities:

- endpoint declaration;
- middleware wiring;
- request parsing;
- request validation wiring;
- authentication/authorization middleware wiring;
- controller invocation.

Routes must NOT:

- implement business rules;
- perform database queries;
- call external providers directly;
- contain persistence logic.

If the repository currently calls this layer `Views`, preserve existing naming unless a refactor is explicitly requested.

Semantically, treat it as the HTTP/transport layer.

---

# 3. CONTROLLERS

Controllers are the established application orchestration layer in this
repository.

Responsibilities:

- receive validated input;
- extract request context;
- coordinate application workflows;
- apply business rules for the current flow;
- call Models for persistence;
- call isolated Integrations when external systems are involved;
- coordinate `db.transaction` when multiple dependent writes must remain atomic;
- translate application results into HTTP responses;
- map known application errors to transport responses.

Controllers should remain cohesive and reviewable, but they are not required to
be thin adapters when the current project pattern places orchestration here.

Controllers must NOT:

- implement provider-specific integration internals;
- duplicate persistence query logic that belongs in Models;
- contain persistence logic;
- duplicate validation already performed at the boundary.

---

# 4. SERVICES / USE CASES

Services / Use Cases are optional extraction points.

Responsibilities may include:

- business rules;
- workflows;
- orchestration;
- domain validation;
- repository coordination;
- external integration coordination;
- transaction orchestration when appropriate.

Services should be independently testable when practical.

Do not create meaningless one-line Services solely to satisfy architecture. If a
controller is already cohesive and follows the existing `View -> Controller ->
Model` pattern, keep the logic there.

---

# 5. MODELS / REPOSITORIES

Persistence concerns belong here.

Responsibilities may include:

- database entities;
- queries;
- persistence operations;
- persistence-specific mapping.

Models / Repositories must NOT:

- depend on Controllers;
- know about HTTP requests or responses;
- call external APIs;
- contain presentation logic.

If a Repository abstraction already exists, use it instead of bypassing it.

---

# 6. EXTERNAL INTEGRATIONS

Third-party communication must remain isolated.

Examples:

- fiscal/tax APIs;
- payment providers;
- email providers;
- cloud services;
- messaging systems;
- external REST APIs.

Integration modules should encapsulate:

- authentication;
- provider-specific request formatting;
- provider-specific response parsing;
- provider-specific errors.

Controllers or Services / Use Cases orchestrate integrations, depending on the
local module pattern.

Never perform external API calls inside Models or Repositories.

---

# 7. DATABASE ACCESS

Avoid:

- N+1 queries;
- queries inside avoidable loops;
- unbounded result sets;
- unnecessary relation loading;
- retrieving unused large fields;
- repeated equivalent queries.

Use transactions when multiple dependent writes must succeed or fail together.

---

# 8. ERROR HANDLING

Preserve distinctions between:

- validation errors;
- business/domain errors;
- authentication errors;
- authorization errors;
- provider/infrastructure errors;
- unexpected internal errors.

Do not leak sensitive internal information through API responses.

Do not use HTTP-specific concerns inside persistence code unless the repository intentionally follows that architecture.

---

# 9. TESTING

For backend behavioral changes, consider:

- success path;
- relevant edge cases;
- expected failures;
- authorization behavior;
- persistence behavior;
- regression scenario.

Bug fixes should reproduce the original failure in a test when practical.

# ============================================================
