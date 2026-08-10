# ARQUIVO 8

# CAMINHO: <project>/.agents/testing.md

# ============================================================

# TESTING RULES

Tests exist to verify behavior and prevent regressions.

Current repository testing reality:

- Backend tests use Node's built-in test runner through `npm test` in
  `backend/`.
- Existing backend integration coverage is concentrated in
  `backend/src/views/catalog.routes.test.ts`.
- Frontend currently has no automated test runner or test script.

# 1. BEHAVIORAL CHANGES

For behavioral changes, consider tests for:

1. Expected path.
2. Relevant edge cases.
3. Expected failure.
4. Permission/authorization behavior.
5. Regression scenario.

Bug fixes should preferably include a test that fails before the fix and passes after it.

---

# 2. TEST QUALITY

Prefer testing observable behavior over implementation details.

Avoid tests unnecessarily coupled to:

- private methods;
- internal function structure;
- arbitrary implementation details.

Test contracts and externally meaningful behavior whenever practical.

---

# 3. EXISTING FAILURES

Never hide existing failures.

If a test fails:

1. Determine whether the implementation is wrong.
2. Determine whether requirements intentionally changed.
3. Determine whether the test itself is obsolete.

Only update the test if its previous expectation is genuinely incorrect or intentionally changed.

Never weaken assertions merely to make CI green.

---

# 4. MOCKING

Mock external boundaries when appropriate.

Avoid excessive mocking of internal application behavior when doing so makes tests meaningless.

Mocks should not hide integration behavior the test is intended to verify.

---

# 5. VERIFICATION COMMANDS

Use repository-defined scripts.

Current checks include:

- backend: `npm run typecheck`, `npm run build`, `npm test`;
- frontend: `npm run typecheck`, `npm run build`.

Formatter, lint, and frontend test scripts are not currently configured. Do not
invent or require them during ordinary validation until the repository adds
those scripts.

Only run commands that actually exist in the repository.

Report anything that could not be executed.

# ============================================================
