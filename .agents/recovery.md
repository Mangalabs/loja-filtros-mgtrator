# AI CONTEXT RECOVERY PROTOCOL

Use this protocol whenever:

- task scope becomes unclear;
- implementation begins drifting;
- architecture rules may have been forgotten;
- repeated unexpected failures occur;
- assumptions begin replacing repository evidence;
- implementation no longer clearly matches the original request;
- too many intermediate changes make the current state difficult to reason about;
- instruction paths or repository structure no longer match previous assumptions;
- the working directory or repository root becomes uncertain;
- validation results contradict the expected implementation state.

# RECOVERY DECISION RULE

Recovery does not require eliminating every repository inconsistency.

During recovery, classify discovered inconsistencies using the Bootstrap Inconsistency Resolution Policy from the root `AGENTS.md`.

LEVEL 1 and LEVEL 2 findings:

- record;
- resolve safely when necessary;
- continue.

LEVEL 3 findings:

- investigate until a dominant interpretation is established.

LEVEL 4 findings:

- block only the affected implementation path.

Do not repeatedly trigger recovery because of the same previously acknowledged non-blocking inconsistency.

Once a safe resolution has been established during the current task, preserve that resolution unless new repository evidence contradicts it.

# 1. STOP

Stop modifying code.

Do not attempt another speculative fix.

Do not expand scope.

Do not perform cleanup or refactoring during recovery.

---

# 2. RE-ESTABLISH WORKSPACE

Determine again:

1. Current working directory.
2. Git repository root.
3. Project root relevant to the task.
4. Whether Git is functional.

Do not rely on the workspace location remembered from earlier context.

If Git unexpectedly fails, resolve or understand the discrepancy before relying on Git-dependent conclusions.

---

# 3. RELOAD INSTRUCTIONS

Re-read:

1. Original task request.
2. Root project `AGENTS.md`.
3. Applicable local `AGENTS.md`.
4. Relevant `.agents/*.md` documents.

Verify referenced paths literally.

Do not treat:

`.agents/`

as equivalent to:

`agents/`

or make similar path substitutions without explicit repository evidence.

If instruction structure has become inconsistent, identify the inconsistency before continuing.

---

# 4. RE-ESTABLISH REPOSITORY BASELINE

Inspect:

- Git status;
- current Git diff;
- staged changes;
- untracked files;
- files modified during the task.

Distinguish:

- pre-existing user changes;
- changes made for the current task;
- unrelated modifications.

Never revert or overwrite unrelated user changes.

---

# 5. RECONSTRUCT TASK STATE

Reconstruct:

## Original Goal

What was requested?

## Non-Goals

What should remain unchanged?

## Completed

What has actually been implemented?

## Verified

What has actually been tested or validated?

## Remaining

What remains to be done?

## Decisions

Which important implementation decisions were made?

## Assumptions

Which assumptions have not been proven by repository evidence?

## Risks

What could currently break?

Do not reconstruct task state from memory alone.

Validate it against the repository.

---

# 6. AUDIT CURRENT IMPLEMENTATION

Check the current diff for:

- scope drift;
- architectural violations;
- unnecessary refactors;
- breaking changes;
- missing validation;
- missing tests;
- security problems;
- invented assumptions;
- duplicated logic;
- abandoned partial implementations;
- unsafe type suppression;
- unintended dependency changes.

Compare the current implementation against the original request.

---

# 7. REVALIDATE THE IMPLEMENTATION PLAN

Determine whether the previous plan is still valid.

If new repository evidence invalidates the plan:

DO NOT force the previous plan.

Create a new minimal plan based on current evidence.

Identify:

1. What should remain.
2. What should be corrected.
3. What should be removed if it was introduced incorrectly.
4. What still needs implementation.
5. Which validations must be rerun.

---

# 8. CORRECT BEFORE CONTINUING

Correct known rule violations before adding further functionality.

Do not stack additional implementation on top of a state known to be inconsistent.

Preserve correct existing work whenever possible.

Do not restart the entire implementation unless necessary.

---

# 9. RESUME

Resume from the smallest remaining valid step.

After resuming:

1. Implement one coherent step.
2. Validate it.
3. Re-check relevant assumptions.
4. Continue only when the state remains trustworthy.

---

# 10. RECOVERY PRINCIPLE

Recovery is not:

**remember what I was doing → continue**

Recovery is:

**workspace**
→ **instructions**
→ **task**
→ **repository**
→ **diff**
→ **validation**
→ **new trustworthy state**
→ **continue**

Repository evidence always takes precedence over remembered assumptions.
