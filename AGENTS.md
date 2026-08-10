# PROJECT AI ENGINEERING RULES

This file defines repository-wide engineering rules.

Global rules from `~/.codex/AGENTS.md` still apply unless explicitly overridden here.

# 1. SOURCE OF TRUTH

For every task, use this priority:

1. Explicit requirements of the current task.
2. Applicable `AGENTS.md` instructions.
3. Existing repository architecture and code patterns.
4. Tests and public contracts.
5. Supporting documentation under `.agents/`.
6. General engineering conventions.

Never silently reinterpret requirements merely to simplify implementation.

Repository evidence takes precedence over remembered assumptions.

---

# BOOTSTRAP INCONSISTENCY RESOLUTION POLICY

The purpose of initial analysis is to reduce implementation risk, not to block development because of harmless repository imperfections.

When an inconsistency is discovered, classify it before deciding whether implementation must stop.

# 1. INCONSISTENCY SEVERITY

Every discovered inconsistency must be classified as one of:

## LEVEL 1 — INFORMATIONAL

The inconsistency does not materially affect implementation.

Examples:

- minor naming inconsistencies;
- missing optional documentation;
- unused empty directories;
- unavailable tooling not required by the task;
- documentation wording differences with no behavioral impact.

Action:

- record it briefly;
- continue development.

Do not ask for clarification.

---

## LEVEL 2 — SAFE RESOLUTION

The inconsistency can be resolved deterministically from strong repository evidence without changing application behavior.

Examples:

- an instruction references `.agents/architecture.md` while the only matching file is `.agents/architeture.md`;
- a README references a clearly renamed directory and exactly one replacement exists;
- project implementation clearly lives under `project/` while challenge/input files live in the parent workspace;
- Git is unavailable but the task does not require Git operations.

Action:

1. State the resolution internally.
2. Record it in the analysis summary.
3. Use the resolved interpretation.
4. Continue development.

Do not ask the user for clarification.

Do not modify files merely to normalize the inconsistency unless the requested task requires it.

---

## LEVEL 3 — MATERIAL AMBIGUITY

Multiple plausible interpretations exist and choosing one could materially affect implementation.

Examples:

- two possible project roots both contain active source code;
- two different architecture documents conflict;
- multiple similarly named schemas exist with different meanings;
- a requirement can reasonably produce incompatible public behavior.

Action:

1. Investigate repository evidence further.
2. Search callers, configuration, tests, and existing patterns.
3. Choose an interpretation only if evidence makes one clearly dominant.

If a safe interpretation becomes clear:

- record the decision;
- continue.

If ambiguity remains and the choice materially affects correctness, treat it as Level 4.

---

## LEVEL 4 — BLOCKING

Stop implementation only when the unresolved inconsistency could reasonably cause:

- data loss;
- security vulnerability;
- destructive filesystem or Git behavior;
- implementation in the wrong application/repository;
- incompatible public API behavior;
- incorrect business behavior that cannot be inferred safely;
- irreversible database changes;
- overwriting existing user work.

Action:

- stop the affected implementation;
- report the specific blocker;
- request clarification only if repository evidence cannot resolve it.

A blocker should be exceptional.

---

# 2. DEFAULT BIAS

The default behavior is:

**investigate → classify → resolve safely → continue**

not:

**detect inconsistency → stop**

and not:

**detect inconsistency → silently assume**

The agent should maximize forward progress while preserving correctness and safety.

---

# 3. DETERMINISTIC SAFE-RESOLUTION RULE

A mismatch may be resolved automatically when ALL of the following are true:

1. The intended reference is clear.
2. Exactly one plausible replacement exists.
3. The replacement is structurally located where expected.
4. Its content matches the expected responsibility.
5. Using it does not alter application behavior.
6. The resolution is reversible.
7. No security or data-integrity risk is introduced.

If all conditions hold:

- use the resolved interpretation;
- record the mismatch;
- continue.

Example:

Expected:

`.agents/architecture.md`

Found:

`.agents/architeture.md`

If it is the only architecture document and contains architecture rules:

Treat it as the intended architecture document for the current analysis.

Do not block implementation solely because of the filename typo.

---

# 4. TOOLING DEGRADATION

Missing or broken tooling does not automatically block development.

Classify tooling by whether the requested task requires it.

Example:

Git unavailable:

Allowed:

- reading files;
- analyzing code;
- creating implementation;
- running tests;
- running lint;
- running typecheck;
- running build.

Unavailable:

- reliable Git baseline;
- Git diff;
- Git commit;
- branch operations.

The final report must state which verification mechanisms were unavailable.

Do not stop application development solely because Git is unavailable unless Git state is required to safely perform the requested operation.

---

# 5. PROJECT ROOT RESOLUTION

Distinguish between:

## Workspace Root

Directory containing the overall task/workspace.

## Implementation Root

Directory containing the application being developed.

## External Inputs

Specifications, fixtures, challenge files, datasets, or other inputs that may live outside the implementation root.

These directories do not need to be identical.

If repository evidence clearly establishes:

workspace/
specification.md
input.json
project/
AGENTS.md
backend/
frontend/

then treat:

workspace/ = workspace root

workspace/project/ = implementation root

workspace/specification.md and workspace/input.json = external task inputs

This structure alone is not ambiguous and should not block development.

---

# 6. DO NOT NORMALIZE INCIDENTAL ISSUES

During implementation, do not automatically fix unrelated bootstrap inconsistencies.

Examples:

- rename misspelled documentation files;
- initialize Git;
- reorganize directories;
- rename configuration files;
- clean unrelated files.

Record them instead.

Only fix them when:

- required for the requested task;
- explicitly requested;
- or necessary to safely continue.

---

# 7. PROGRESS PRINCIPLE

A repository does not need to be perfectly organized before development can begin.

The agent must distinguish:

**imperfection**

from:

**unsafe ambiguity**

Imperfection should normally be tolerated.

Unsafe ambiguity should be investigated.

Only unresolved material risk should block implementation.

# 2. INITIAL ANALYSIS / BOOTSTRAP PROTOCOL

Before analyzing implementation details or modifying code, establish a trustworthy understanding of the workspace.

The initial analysis MUST follow the phases below in order.

Do NOT modify source code during this protocol.

## PHASE 1 — ESTABLISH WORKSPACE

Determine:

1. Current working directory.
2. Git repository root, if applicable.
3. Project root relevant to the requested task.
4. Whether Git is functional.
5. Whether the current working directory belongs to the expected repository.

When Git is expected to be available, verify repository state using the repository itself rather than inferring it from directory names.

Do not assume that the presence of a `.git` path proves that the current working directory is correct.

If Git commands unexpectedly fail:

1. Stop Git-dependent assumptions.
2. Determine the actual working directory.
3. Determine whether `.git` is a directory, file, worktree reference, or belongs to another directory.
4. Determine the real repository root.
5. Retry repository inspection from the correct location.

Do NOT postpone unexpected workspace or Git inconsistencies until after implementation.

---

## PHASE 2 — DISCOVER INSTRUCTION SOURCES

Identify the instruction files applicable to the task.

Inspect exact paths.

Expected project instruction structure may include:

`AGENTS.md`

`backend/AGENTS.md`

`frontend/AGENTS.md`

and specialized documentation under:

`.agents/`

Do not treat similarly named paths as equivalent.

For example:

`.agents/`

and:

`agents/`

are different paths.

Likewise:

`backend/AGENTS.md`

and:

`backend-agents.md`

are not interchangeable.

Do not silently substitute one path for another.

---

## PHASE 3 — LOAD APPLICABLE INSTRUCTIONS

Read instructions in scope before analyzing implementation details.

At minimum read:

1. Root project `AGENTS.md`.
2. Applicable local `AGENTS.md`.
3. Specialized documents explicitly required for the task.

### Backend task

Read:

`backend/AGENTS.md`

For significant architecture work also read:

`.agents/architecture.md`

### Frontend task

Read:

`frontend/AGENTS.md`

### Full-stack task

Read both:

`backend/AGENTS.md`

`frontend/AGENTS.md`

and any relevant specialized documents.

### Database changes

Read:

`.agents/database.md`

### Security-sensitive changes

Read:

`.agents/security.md`

### Testing work

Read:

`.agents/testing.md`

### Large tasks

Read:

`.agents/long-tasks.md`

### Context recovery

Read:

`.agents/recovery.md`

### Final significant review

Read:

`.agents/code-review.md`

---

## PHASE 4 — VALIDATE INSTRUCTION CONSISTENCY

Verify that every instruction file referenced for the task actually exists at the exact referenced path.

If instructions reference:

`.agents/database.md`

but only:

`agents/database.md`

exists, treat this as an instruction/configuration inconsistency.

DO NOT automatically decide that the existing path is "probably what was intended."

DO NOT silently repair instruction references.

DO NOT base architecture or implementation decisions on an assumed replacement path.

Instead:

1. Verify the project root.
2. Verify the exact filesystem paths.
3. Verify whether another applicable `AGENTS.md` changes the instruction.
4. Determine whether repository evidence resolves the discrepancy unambiguously.

If the discrepancy cannot be resolved safely, report it as a blocker before implementation.

Instruction paths are contracts, not suggestions.

---

## PHASE 5 — ESTABLISH BASELINE REPOSITORY STATE

Before modifying anything, inspect the existing repository state.

Determine:

- modified files;
- staged files;
- untracked files;
- relevant existing changes;
- current branch when useful.

Existing changes may belong to the user.

Never assume existing modifications were created by the agent.

Never overwrite, revert, or normalize unrelated existing changes.

If repository state cannot be reliably determined, broad or destructive modifications are unsafe.

---

## PHASE 6 — UNDERSTAND THE TASK

Re-read the original request.

Determine:

### Goal

What behavior must change?

### Non-Goals

What should remain unchanged?

### Acceptance Criteria

What must be true for the task to be considered complete?

### Constraints

Which:

- architecture;
- compatibility;
- security;
- data;
- performance;
- product;

constraints apply?

Begin from requested behavior, not from a guessed implementation.

---

## PHASE 7 — MAP THE RELEVANT PROJECT STRUCTURE

Now inspect the project structure relevant to the task.

Identify only what is useful to understand the requested change.

Possible relevant areas include:

- entry points;
- routes;
- controllers;
- services;
- repositories;
- models;
- schemas;
- integrations;
- frontend modules;
- shared code;
- tests;
- configuration.

Do not recursively read the entire repository without purpose.

Start from the requested behavior and expand outward as necessary.

---

## PHASE 8 — MAP THE EXISTING IMPLEMENTATION

Locate:

1. Current implementation.
2. Entry points.
3. Callers.
4. Consumers.
5. Relevant types.
6. Schemas/models.
7. Services/use cases.
8. Repositories.
9. Integrations.
10. Related tests.

Search for similar existing implementations.

Do not design a new solution before understanding how the repository currently solves comparable problems.

---

## PHASE 9 — IDENTIFY ESTABLISHED PATTERNS

Determine existing conventions for the affected area.

Inspect patterns for:

- architecture;
- validation;
- errors;
- persistence;
- API responses;
- integrations;
- state management;
- UI components;
- tests.

Prefer existing patterns unless they are directly responsible for the problem being solved.

Do not introduce parallel architecture unnecessarily.

---

## PHASE 10 — DETERMINE VALIDATION STRATEGY

Before implementation, determine how correctness will be verified.

Inspect repository-defined scripts and configuration.

Determine which checks are relevant:

- targeted tests;
- unit tests;
- integration tests;
- end-to-end tests;
- typecheck;
- lint;
- build.

Determine whether a regression test is required.

Do not invent validation commands without checking the repository.

---

## PHASE 11 — FORM IMPLEMENTATION PLAN

Only after completing the analysis above should an implementation plan be formed.

The plan should identify:

1. Goal.
2. Expected files or modules affected.
3. Architectural layers affected.
4. Expected behavior changes.
5. Tests expected to change or be added.
6. Compatibility risks.
7. Security/data risks.
8. Validation steps.

Choose the smallest valid solution.

For trivial changes, keep the plan concise.

For large tasks, follow:

`.agents/long-tasks.md`

---

## PHASE 12 — INITIAL ANALYSIS SUMMARY

Before modifying code on a non-trivial task, establish a concise working summary containing:

### Workspace

- working directory;
- repository root;
- project root.

### Instructions

- applicable `AGENTS.md`;
- specialized rules loaded;
- detected instruction inconsistencies.

### Repository State

- whether Git is functional;
- whether pre-existing changes exist.

### Task

- goal;
- relevant non-goals;
- acceptance criteria.

### Relevant Implementation

- main entry points/modules;
- existing pattern to follow.

### Validation

- relevant verification commands/tests.

### Plan

- smallest implementation sequence.

Do not produce a large repository inventory.

The summary should contain only information relevant to safely executing the task.

---

## PHASE 13 — IMPLEMENTATION GATE

Code modification may begin only when:

- workspace is understood;
- relevant instruction sources are known;
- instruction paths are consistent;
- repository baseline is understood;
- task goal is understood;
- relevant implementation has been located;
- validation strategy is known;
- implementation plan is coherent.

If any material prerequisite is unresolved, investigate before modifying code.

---

# INITIAL ANALYSIS FAILURE CONDITIONS

An inconsistency discovered during bootstrap does NOT automatically block implementation.

First classify it using the Bootstrap Inconsistency Resolution Policy.

Stop implementation only when an unresolved issue is classified as LEVEL 4 — BLOCKING.

Examples include:

- implementation root cannot be safely determined;
- multiple conflicting instruction sources materially affect implementation and repository evidence cannot establish precedence;
- repository state cannot be understood and the requested operation may overwrite existing work;
- an unresolved decision could cause data loss;
- an unresolved decision could introduce a security vulnerability;
- incompatible public behavior cannot be safely inferred;
- a destructive database operation cannot be evaluated safely.

The following are NOT blockers by themselves:

- Git unavailable when Git operations are not required;
- filename typos with a unique safe resolution;
- optional documentation missing;
- empty directories;
- workspace root differing from implementation root;
- absence of validation tooling in a new project;
- missing source code in a project that has not yet been implemented.

For non-blocking inconsistencies:

**record → resolve when safe → continue**

Do not require user clarification for inconsistencies that repository evidence resolves deterministically.

# 4. INITIAL ANALYSIS PRINCIPLE

The first objective is NOT to write code.

The first objective is to establish a trustworthy model of:

**workspace**
→ **instructions**
→ **repository state**
→ **requested behavior**
→ **existing implementation**
→ **validation**
→ **plan**

Only then modify code.

---

# 5. PUBLIC CONTRACTS

Treat existing externally consumed contracts as stable unless the task explicitly requires a breaking change.

Before changing:

- endpoint paths;
- request fields;
- response fields;
- HTTP status behavior;
- enum values;
- event names;
- webhook payloads;
- public function signatures;
- externally consumed types;

search for consumers.

Prefer additive and backward-compatible changes.

Breaking changes must be explicitly required and clearly reported.

---

# 6. INPUT VALIDATION

Treat external input as untrusted.

Validate at system boundaries when applicable:

- request bodies;
- query parameters;
- route parameters;
- webhooks;
- file uploads;
- external service responses;
- environment configuration.

Frontend validation improves UX but never replaces backend validation.

---

# 7. CODE QUALITY

Optimize primarily for:

- correctness;
- readability;
- cohesion;
- explicit behavior;
- maintainability.

Avoid:

- unnecessary abstractions;
- speculative generalization;
- excessive nesting;
- duplicated business rules;
- functions with unrelated responsibilities.

Do not optimize for arbitrary metrics such as:

- number of files;
- number of functions;
- number of conditionals;
- number of lines.

# 7.1 FORMATTING REALITY

No repository-wide formatter or lint script is currently configured.

Follow the style already present in the touched file and avoid broad
formatting-only churn. Do not require `.prettierrc`, ESLint, or formatter
validation until the repository adds those files/scripts.

---

# 8. PERFORMANCE

Do not perform speculative optimization.

However, avoid obvious regressions such as:

- N+1 database queries;
- sequential independent network operations;
- repeated expensive computation;
- unnecessary network calls;
- unbounded database queries;
- unnecessarily large responses;
- obvious unnecessary frontend rerenders.

Performance changes should have a concrete justification.

---

# 9. ASYNC AND CONCURRENCY

Independent operations may execute concurrently when safe.

Before introducing concurrency, evaluate:

- ordering requirements;
- race conditions;
- transaction boundaries;
- rate limits;
- partial failures;
- shared state.

Never parallelize operations merely for style.

---

# 10. DEFINITION OF DONE

A task is complete only when, as applicable:

- requested behavior is implemented;
- architecture rules are respected;
- relevant types are valid;
- relevant tests pass;
- typecheck passes;
- lint passes;
- build passes;
- security requirements are respected;
- public compatibility is preserved;
- final diff contains only intended changes;
- no debug artifacts remain;
- no known required validation is failing.

Never report a task as fully complete while a known required validation is failing.

---

# 11. FINAL REPORT

At completion, report concisely:

- what changed;
- important implementation decisions;
- tests/checks executed;
- anything not verified;
- relevant risks or follow-up work.

Do not produce a long implementation diary unless requested.
