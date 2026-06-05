# SpecDD Project Bootstrap — LaserReady

## Platform

TypeScript/React/Vite/Electron

## Project Conventions

- Feature-based directory structure under `src/features/`.
- Zustand for state management (slices pattern).
- Command pattern for all undoable operations.
- Vitest for unit tests, Playwright for E2E.
- Tailwind CSS for styling.
- Paper.js for geometry operations (boolean, offset).
- All units internally in pixels (96 DPI); UI displays mm.

## Naming

- Spec files use kebab-case: `select-tool.sdd`, `boolean-ops.sdd`.
- Source files use kebab-case for modules, PascalCase for classes/components.
- Test files colocate with source: `feature.test.ts` beside `feature.ts`.

## Code Rules

- TypeScript strict mode with `noUncheckedIndexedAccess`.
- No `any` in new code; use proper interfaces or `unknown`.
- All user-facing operations must be undoable via Command pattern.
- All user-facing errors use `notify()` from Toast, not `console.log` or `alert()`.
- No `@ts-ignore` or `@ts-nocheck` in new code.

## Testing

- Every new command must have a unit test.
- Every new tool must have at minimum one interaction test.
- Run `npx tsc --noEmit && npx vitest run` to verify changes.

## Commit

- One logical change per commit.
- Commit message format: `type(scope): description`.
