# LaserReady Style Guide

## Project Architecture

### Directory Structure

```text
src/
├── config/              # Application configuration
│   └── constants.ts     # Centralized constants (colors, sizes, defaults)
├── core/                # Core functionality
│   ├── commands/        # Command pattern base
│   ├── math/            # Mathematical utilities
│   ├── tools/           # Base tool classes
│   └── types/           # Core type definitions
├── features/            # Feature modules
│   ├── editor/          # Editor feature
│   ├── shapes/          # Shapes feature
│   │   ├── commands/    # Shape commands
│   │   ├── manipulation/\
│   │   ├── models/      # Shape models
│   │   ├── tools/       # Shape tools
│   └── ui/              # UI components
├── shared/              # Shared components
│   └── ui/              # Shared UI components (Button, Input, Icon)
├── store/               # State management
├── types/               # Global type definitions
└── utils/               # Utility functions
```

## Naming Conventions

### Files and Directories

1.  **Component Files**: PascalCase (e.g., `Canvas.tsx`, `Button.tsx`)
2.  **Utility Files**: kebab-case (e.g., `svg-export.ts`, `text-measure.ts`)
3.  **Model Files**: Simple names without redundancy (e.g., `path.ts` instead of `path-shape.ts`)
4.  **Tool Files**: Simple names (e.g., `pen.ts` instead of `pen-tool.ts`)
5.  **Command Files**: Simple names (e.g., `delete.ts` instead of `delete-shape-command.ts`)

**Rationale**: The directory provides context. Avoid repeating the context in the filename (DRY Principle applied to file naming).

## Technology Stack Guidelines

### React & Components

- **Functional Components**: Use `const` definition.
- **Props Interface**: Always define a `Props` interface (even if empty) exported above the component.
- **File Structure Order**:
  1. Imports (External -> Internal -> Styles)
  2. Interfaces/Types
  3. Component Definition
  4. Hooks definition
  5. Helper functions (if logic is complex, extract to custom hook)
  6. JSX Return

### Styling (Tailwind CSS)

- **Utility First**: Use standard Tailwind classes over arbitrary values (avoid `w-[13px]` unless strictly necessary).
- **Conditionals**: Use `clsx` or `tailwind-merge` for conditional class names.
  ```tsx
  // ✅ DO
  <div className={clsx('p-4', isActive && 'bg-blue-500')} />
  
  // ❌ DON'T
  <div className={`p-4 ${isActive ? 'bg-blue-500' : ''}`} />
  ```

### State Management (Zustand)

- **Slices Pattern**: Divide store logic into domain-specific slices (`slices/shapes.ts`, `slices/ui.ts`).
- **Selectors**: Select only what you need to prevent unnecessary re-renders.
  ```tsx
  // ✅ DO
  const zoom = useStore((state) => state.zoom);
  
  // ❌ DON'T (triggers re-render on any store change)
  const { zoom } = useStore();
  ```

### Internationalization (i18n)

- **No Hardcoded Strings**: All user-facing text must use the translation hook.
- **Keys**: Use nested keys for clarity (e.g., `toolbar.tools.pen`).
  ```tsx
  // ✅ DO
  <span>{t('toolbar.tools.select')}</span>
  
  // ❌ DON'T
  <span>Select Tool</span>
  ```

### Testing

- **Co-location**: Test files reside next to the implementation.
  - `src/core/math/geometry.ts` -> `src/core/math/geometry.test.ts`
  - `src/shared/ui/Button.tsx` -> `src/shared/ui/Button.test.tsx
