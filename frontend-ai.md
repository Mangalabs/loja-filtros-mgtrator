# FRONTEND CONTEXT & UI ARCHITECTURE RULES

## 1. Frontend Stack

Use the defined frontend stack:

- React
- TypeScript
- Vite
- MUI Material
- Tailwind CSS
- lucide-react for icons already used in the project

MUI Material is the primary UI component layer. Tailwind CSS should be used mainly for layout, spacing, responsive behavior, and small composition utilities.

Do not add another UI library unless explicitly requested.

---

## 2. Color System

Use this palette as the visual base for the frontend:

- Primary navy: `#203466`
- Accent gold: `#d8b769`
- Dark text/base: `#2c281e`
- Muted green-gray: `#8a9f9d`
- Muted blue-gray: `#848eb4`

Prefer mapping these colors into the MUI theme before spreading them through isolated components.

Suggested usage:

- `#203466`: primary actions, active navigation, headers.
- `#d8b769`: highlights, secondary accents, attention markers.
- `#2c281e`: primary text and strong neutral surfaces.
- `#8a9f9d`: muted borders, helper text, subtle backgrounds.
- `#848eb4`: secondary state, informational accents, quiet UI details.

---

## 3. Architecture Rules

Keep the frontend organized by feature and responsibility:

- `components`: reusable shell, layout, and UI components.
- `views`: page-level components grouped by business area.
- `hooks`: reusable state/action hooks.
- `utils`: pure formatting, display, and form helpers.
- `api.ts`: API contracts and HTTP helpers only.

Avoid large files. When a page grows, extract:

- page sections;
- tables;
- forms;
- status/presentation mappings;
- business-specific frontend helpers;
- hooks for page actions.

Do not create circular imports between views, hooks, and shared components.

---

## 4. UI Rules

Use MUI components for interactive and semantic UI:

- buttons;
- text fields;
- dialogs;
- alerts;
- chips;
- cards/panels;
- tables when replacing existing manual tables;
- menus/selects;
- tabs/accordions if needed.

Product-related fields must use searchable autocomplete instead of large select lists.

- Search should match product name, internal code, barcode, manufacturer, and location.
- The visible field should help the operator identify stock and internal data.
- The submitted form value must remain the product `id`.
- Reuse a shared component for this pattern before adding new product selectors.

Use Tailwind for composition:

- grid/flex layout;
- spacing;
- responsive widths;
- overflow handling;
- simple alignment;
- page-level wrappers.

Avoid adding new global CSS classes when Tailwind utilities or an existing shared component solve the problem.

Keep the user's preferred flat screen behavior:

- avoid unnecessary extra windows;
- avoid modal flows except confirmation popups where the action needs explicit confirmation;
- keep main workflows visible on the page.

---

## 5. Conditional Rendering Rules

Minimize long chains of `if/else` or repeated conditional JSX.

Prefer:

- lookup tables;
- strategy maps;
- small rendering components;
- guard clauses;
- status presentation dictionaries.

For route/view rendering, prefer a `Record<View, renderer>` style over a long sequence of view comparisons.

---

## 6. Current Refactoring Targets

Largest frontend files at the start of this refactoring phase:

- `frontend/src/views/finance/FinancePages.tsx`
- `frontend/src/views/sales/SalesPages.tsx`
- `frontend/src/styles.css`
- `frontend/src/views/catalog/CatalogPages.tsx`
- `frontend/src/views/quotes/QuotesPage.tsx`
- `frontend/src/components/AppViewRenderer.tsx`

Refactor in small, safe recuts. Do not rewrite all screens at once.

---

## 7. Planned Refactoring Order

1. Create the frontend visual foundation:
   - `frontend/src/theme.ts`
   - MUI `ThemeProvider`
   - MUI `CssBaseline`
   - palette based on the approved color system.

2. Create shared layout components:
   - `PagePanel`
   - `PageHeader`
   - `FormGrid`
   - `ResponsiveTable`
   - `EmptyState`
   - `ActionGroup` if repeated action layouts justify it.

3. Reduce `styles.css` gradually:
   - keep only global base rules and temporary compatibility styles;
   - move repeated layout into components and Tailwind utilities;
   - remove CSS only after the migrated screens are verified.

4. Refactor `FinancePages.tsx` first:
   - extract `PaymentMethodsPage`;
   - extract `CashRegisterPage`;
   - extract `FiscalDocumentsPage`;
   - move fiscal readiness rules to a focused helper;
   - move fiscal request queue building to a focused helper;
   - move fiscal labels/status presentation to a focused helper.

5. Refactor remaining large views:
   - `SalesPages.tsx`
   - `CatalogPages.tsx`
   - `QuotesPage.tsx`
   - `StockPages.tsx`

6. Refactor view rendering:
   - replace long conditional rendering in `AppViewRenderer.tsx` with a lookup/strategy map.

---

## 8. Workflow Rules

Before frontend edits:

1. Read this file and `ai.md`.
2. Inspect the target file and nearby patterns.
3. Keep each recut small and verifiable.
4. Prefer changing one feature area at a time.
5. Run `npm run typecheck` and `npm run build` in `frontend` when the recut changes frontend code.

Use small commits when requested, with clear messages describing the recut.
