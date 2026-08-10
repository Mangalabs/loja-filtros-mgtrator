# ARQUIVO 9

# CAMINHO: <project>/.agents/code-review.md

# ============================================================

# CODE REVIEW RULES

Review the final change as if it were another developer's Pull Request.

# 1. REVIEW PRIORITY

Prioritize findings in this order:

1. Security vulnerabilities
2. Data loss or corruption
3. Broken behavior
4. Authorization problems
5. Breaking API/contracts
6. Race conditions
7. Database consistency issues
8. Missing regression handling
9. Significant performance regressions
10. Maintainability problems

Do not elevate formatting or stylistic preferences into high-severity findings when automated tooling already handles them.

---

# 2. FINAL DIFF AUDIT

Inspect the complete final diff.

Check for:

- unrelated modifications;
- scope drift;
- accidental formatting changes;
- debug logs;
- temporary code;
- commented-out implementations;
- hardcoded values;
- secrets;
- unsafe type casts;
- unnecessary dependencies;
- missing tests;
- compatibility issues;
- architecture violations.

---

# 3. REVIEW FINDINGS

A valid review finding should contain:

- the concrete problem;
- affected location;
- why it matters;
- realistic failure scenario;
- safe correction path.

Avoid speculative findings without evidence.

---

# 4. COMPLETION REVIEW

Do not approve the implementation merely because tests pass.

Tests are evidence, not proof that requirements were satisfied.

Compare the final implementation against:

1. Original task.
2. Definition of Done.
3. Applicable architecture rules.
4. Security requirements.
5. Public contracts.
6. Final Git diff.

# ============================================================
