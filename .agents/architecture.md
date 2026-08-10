# ============================================================

# ARQUIVO 5

# CAMINHO: <project>/.agents/architecture.md

# ============================================================

# ARCHITECTURE RULES

# 1. PRIMARY PRINCIPLE

Architecture exists to preserve:

- separation of concerns;
- dependency direction;
- testability;
- maintainability;
- predictable system behavior.

Do not follow architecture mechanically when doing so creates meaningless abstractions.

Do not bypass architecture merely because a shortcut requires fewer lines.

---

# 2. BACKEND DEPENDENCY DIRECTION

Established backend flow:

`Route / Transport`
→ `Controller`
→ `Repository / Model`

Controllers may depend on Integration abstractions. A Service / Use Case layer
is optional and should be introduced only when it reduces real complexity,
creates meaningful reuse, or matches an established local pattern.

Forbidden dependencies include:

- Repository / Model → Controller
- Integration → Controller
- Repository → HTTP request/response
- Route → direct database access
- Route → direct third-party provider access

Circular dependencies are forbidden.

---

# 3. BUSINESS LOGIC

In this repository, Controllers are the established application orchestration
layer. They may coordinate:

- business workflows;
- business rules for the current use case;
- transactions;
- model operations;
- integration calls through isolated Integration modules.

Extract Services / Use Cases only when controller logic becomes meaningfully
hard to maintain or must be reused across flows.

Repositories adapt persistence concerns.

Integrations adapt third-party systems.

---

# 4. NEW ABSTRACTIONS

Before creating a new abstraction:

1. Search for an existing equivalent.
2. Verify that the responsibility genuinely exists.
3. Verify that the abstraction simplifies current requirements.
4. Avoid designing for hypothetical future requirements.

Do not introduce a pattern merely because it is theoretically cleaner.

---

# 5. ARCHITECTURAL CHANGES

Do not perform broad architectural migrations as side effects of unrelated tasks.

Legacy code unrelated to the requested change should normally remain untouched.

New code should follow the intended architecture unless compatibility with
surrounding code requires otherwise. For the current backend, that intended
architecture is `View / Route -> Controller -> Model`, with optional Services /
Use Cases.

---

# 6. DEPENDENCY CYCLES

Never solve dependency problems with circular imports.

Do not use service locators or global registries merely to hide architectural cycles.

If a dependency cycle appears, reconsider responsibility boundaries.

# ============================================================
