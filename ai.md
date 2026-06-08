# SYSTEM CONTEXT & ARCHITECTURE RULES

## 1. CORE ARCHITECTURE (Backend)

Strictly follow the layered MVC-inspired architecture. No exceptions.

- **Models**: Database schemas, queries, and internal persistence ONLY.
- **Controllers**: Business logic, orchestration, and flow control ONLY.
- **Views**: API routes, request entry points, and endpoint definitions ONLY.
- **External Integrations**: Third-party services (e.g., fiscal/tax emission, external APIs) MUST be isolated in dedicated integration folders and called EXCLUSIVELY by Controllers.

### Dependency Constraints:

- NEVER create cyclic dependencies.
- Models MUST NOT depend on Controllers.
- External integration calls MUST NOT exist inside Models.

---

## 2. CODE STYLE & PATTERNS

- **Conditional Logic**: Minimize `if/else` structures. Prioritize:
  1. Guard Clauses (Early Returns)
  2. Object Literals / Dictionaries (Key-Value mapping)
  3. Strategy Pattern (Polymorphism)
  4. Ternary Operators (For simple binary assignments)
- **Formatting**: Adhere strictly to the existing `.prettierrc` configuration.
- **Consistency**: Follow the established code patterns already present in the repository. Do not invent new structures if a pattern exists.

---

## 3. FRONTEND STACK

- **UI Framework**: Use `MUI Material` (@mui/material) for all UI components.
- Do not install or use alternative UI libraries unless explicitly instructed.
- Match existing MUI component patterns, styling approaches, and theme configurations.

---

## 4. WORKFLOW & GIT OPERATIONS

Act strictly with a Pull Request (PR) Reviewer mindset. Analyze impact before writing code.

- **Scope**: Keep changes minimal, isolated, and scalable.
- **Commits**: Aim for short, atomic commits (average of ~4 small files per commit when reasonable).
- **Refactoring**: DO NOT refactor unrelated code blocks. Focus only on the requested task.
- **Destructive Actions**: NEVER delete, overwrite, or revert existing code/logic without explicit user confirmation.

---

## 5. EXECUTION PROTOCOL

Before writing any code or generating a response:

1. Scan the current repository to analyze existing patterns.
2. Validate your planned solution against the architecture layers defined in Section 1.
3. Check conditional structures to ensure compliance with Section 2.
