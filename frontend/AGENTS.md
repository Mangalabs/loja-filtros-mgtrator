# ARQUIVO 4

# CAMINHO: <project>/frontend/AGENTS.md

# ============================================================

# FRONTEND AI ENGINEERING RULES

These rules apply to frontend code.

Repository-wide rules from the root `AGENTS.md` remain active.

# 1. UI FRAMEWORK

Use:

`@mui/material`

for UI components.

Tailwind CSS is already part of the project and may be used for layout,
spacing, responsive behavior, overflow handling, and small composition
utilities.

`lucide-react` is the existing icon library. Reuse it for icons unless a task
explicitly requires another source.

Do NOT introduce another UI component library unless explicitly requested.

Reuse existing:

- MUI theme;
- design tokens;
- spacing conventions;
- typography;
- project components;
- styling patterns.

Do not recreate functionality already adequately provided by MUI or existing project components.

---

# 2. COMPONENT DESIGN

Prefer cohesive components with clear responsibilities.

Extract components when extraction:

- creates meaningful reuse;
- encapsulates a responsibility;
- reduces meaningful complexity;
- isolates useful UI behavior.

Do not split components merely because they are long.

Avoid premature generic components.

---

# 3. STATE MANAGEMENT

Use the state-management patterns already established in the repository.

Current project pattern:

- local React state;
- custom hooks under `frontend/src/hooks`;
- feature action hooks under `frontend/src/views/*/use*Actions.ts`;
- `AuthContext` for authentication state.

Do not introduce another state library merely because it is familiar.

Keep state local when possible.

Do not move state globally without a concrete architectural reason.

---

# 4. DATA FETCHING

Reuse existing:

- API clients;
- hooks;
- caching conventions;
- error-handling patterns.

Current project pattern:

- `frontend/src/api.ts` owns API helper functions and frontend response types;
- `frontend/src/hooks/useCatalogData.ts` coordinates the main app data loading;
- feature action hooks call API helpers and then use focused refresh functions
  from `useCatalogData`.

Do not create parallel data-fetching approaches for the same application domain.

Avoid unnecessary duplicate requests.

---

# 5. UI STATES

When applicable, implement:

- loading state;
- empty state;
- error state;
- disabled state;
- success feedback.

Do not implement only the ideal success path.

---

# 6. ACCESSIBILITY

Preserve accessibility.

Prefer:

- semantic HTML;
- correct button/link semantics;
- accessible labels;
- keyboard-accessible interactions;
- appropriate MUI accessibility APIs.

Do not replace semantic interactive elements with clickable generic containers without justification.

---

# 7. FORMS

Use existing form and validation patterns.

Shared validation behavior must remain consistent with backend/domain constraints.

Client-side validation improves UX but never replaces server-side validation.

---

# 8. TYPE SAFETY

Preserve type safety across:

- component props;
- API responses;
- forms;
- state;
- hooks;
- event handlers.

Do not use unsafe casting merely to bypass compiler errors.

---

# 9. PERFORMANCE

Avoid speculative optimization.

Watch for obvious issues such as:

- unnecessary repeated requests;
- unstable dependencies causing repeated effects;
- unnecessary expensive recalculation;
- large avoidable rerender cascades.

Do not add `useMemo`, `useCallback`, or memoization automatically.

Use them only when there is a concrete reason.

---

# 10. FRONTEND TESTING

Prefer testing behavior visible to the user rather than implementation details.

For significant UI behavior, consider:

- normal interaction;
- loading;
- errors;
- empty state;
- disabled/permission behavior;
- regression scenarios.
