# LONG TASK PROTOCOL

Use this protocol for:

- multi-module features;
- significant database migrations;
- major architecture changes;
- large integrations;
- full-stack features affecting multiple application layers;
- tasks involving many dependent implementation stages.

Do not use heavyweight planning for trivial changes.

# 1. BOOTSTRAP FIRST

Before creating a long-task plan, complete the Initial Analysis / Bootstrap Protocol defined in:

`../AGENTS.md`

Do not plan a large implementation while:

- repository root is uncertain;
- instruction hierarchy is uncertain;
- Git baseline is unknown;
- relevant architecture has not been inspected;
- validation strategy is unknown.

The long-task protocol begins only after the project context is trustworthy.

---

# 2. DEFINE THE TASK

Establish:

## Goal

What behavior must exist when the task is complete?

## Non-Goals

What is explicitly outside the requested scope?

## Acceptance Criteria

What observable conditions prove that the goal has been reached?

## Constraints

Which:

- architecture;
- compatibility;
- security;
- data;
- performance;
- product;

requirements apply?

## Affected Areas

Which modules, layers, contracts, and systems are expected to change?

## Risks

What could realistically break?

## Validation

How will correctness be verified?

---

# 3. CREATE LOGICAL CHECKPOINTS

Split work into logical checkpoints.

A checkpoint should produce a state that can be reasoned about and preferably validated independently.

Example:

Checkpoint 1:
domain/schema/contracts

Checkpoint 2:
repository/persistence

Checkpoint 3:
service/business logic

Checkpoint 4:
controller/API

Checkpoint 5:
frontend integration

Checkpoint 6:
final regression validation

Do not follow this sequence mechanically.

Use checkpoints appropriate to the actual task.

---

# 4. BEFORE EACH CHECKPOINT

Before beginning a checkpoint, confirm:

1. The previous checkpoint is in a trustworthy state.
2. Current assumptions still match repository evidence.
3. No relevant instruction has been overlooked.
4. The next checkpoint remains necessary.
5. Scope has not expanded unintentionally.

If the plan is no longer valid, update it before modifying more code.

---

# 5. AFTER EACH CHECKPOINT

Before moving to the next major stage:

1. Inspect the changes from the checkpoint.
2. Verify architecture.
3. Run the smallest relevant validation.
4. Verify checkpoint acceptance criteria.
5. Record completed work.
6. Record verified work.
7. Record remaining work.
8. Identify new risks.

Correct problems before proceeding.

Do not accumulate multiple unverified architectural changes.

---

# 6. MAINTAIN TASK STATE

Maintain a concise working state containing:

## Completed

What has actually been implemented?

## Verified

What has actually been tested or validated?

## Remaining

What still needs implementation?

## Decisions

What significant decisions were made?

## Assumptions

What remains assumed rather than verified?

## Risks

What remains uncertain or potentially dangerous?

This state must reflect repository reality rather than conversation memory.

---

# 7. CONTROL SCOPE DRIFT

At each checkpoint compare the current task state against:

- original Goal;
- Non-Goals;
- Acceptance Criteria.

Do not add adjacent improvements merely because they become visible during implementation.

Record unrelated issues separately rather than fixing them automatically.

---

# 8. RECOVERY TRIGGER

Immediately execute:

`.agents/recovery.md`

when:

- task state and repository state disagree;
- architecture begins drifting;
- repeated failures produce speculative fixes;
- the implementation plan no longer matches repository evidence;
- instruction hierarchy becomes uncertain;
- the agent can no longer clearly state what has been verified versus assumed.

Do not continue implementation merely because significant work has already been invested in the current approach.

---

# 9. FINAL VALIDATION

Before declaring the long task complete:

1. Run all relevant checks.
2. Inspect the complete final diff.
3. Execute `.agents/code-review.md`.
4. Compare implementation against Goal.
5. Compare implementation against Non-Goals.
6. Confirm Acceptance Criteria.
7. Confirm compatibility requirements.
8. Confirm security/data requirements.
9. Report anything that could not be verified.

A long task is not complete merely because every planned checkpoint was executed.

It is complete when the requested behavior has been verified.
