# LaserReady - Style Guide

## File Naming Conventions

### React Components (.tsx)
Use **PascalCase** for React component files.

- ✅ `Toolbar.tsx`
- ✅ `RightSidebar.tsx`
- ✅ `PropertiesPanel.tsx`
- ✅ `AssetLibrary.tsx`
- ❌ `toolbar.tsx`
- ❌ `right-sidebar.tsx`

**Rationale**: Component names in JSX/TSX are PascalCase, so file names should match for consistency.

### Logic/Classes/Utilities (.ts)
Use **kebab-case** for TypeScript files that contain logic, classes, or utilities.

- ✅ `base-tool.ts`
- ✅ `canvas-renderer.ts`
- ✅ `path-editor.ts`
- ✅ `svg-importer.ts`
- ❌ `BaseTool.ts`
- ❌ `CanvasRenderer.ts`

**Rationale**: Separates component files from logic files visually, and kebab-case is common in JavaScript/TypeScript ecosystems.

### React Hooks
Use **camelCase** for custom React hooks.

- ✅ `useStore.ts`
- ✅ `useLanguage.tsx` (if it includes JSX)
- ❌ `use-store.ts`
- ❌ `UseStore.ts`

**Rationale**: React hooks start with "use" in camelCase by convention.

### Type Definition Files
Use **kebab-case** for type definition files.

- ✅ `core.ts`
- ✅ `editor.ts`
- ✅ `layer.ts`
- ✅ `types.ts`

**Exception**: If a types file is specific to a PascalCase component, it can match the component name (e.g., `Toolbar.types.ts`).

## Directory Structure

```
src/
├── components/          # React components (PascalCase.tsx)
├── features/           # Feature modules
│   ├── editor/        # Editor feature
│   │   └── render/   # Renderer logic (kebab-case.ts)
│   └── shapes/       # Shapes feature
├── hooks/             # Custom hooks (camelCase.ts)
├── store/             # State management (kebab-case.ts)
├── types/             # Type definitions (kebab-case.ts)
├── utils/             # Utilities (kebab-case.ts)
└── tools/             # Tool implementations (kebab-case.ts)
```

## Import Conventions

### Component Imports
```typescript
import Toolbar from './components/Toolbar';
import { Button } from './components/Button';
```

### Utility/Logic Imports
```typescript
import { PathEditor } from './features/editor/path-editor';
import { exportToSVG } from './utils/svg-exporter';
```

### Hook Imports
```typescript
import { useStore } from './store/useStore';
import { useLanguage } from './contexts/language';
```

## TypeScript Naming

### Interfaces and Types
- Use **PascalCase** with an `I` prefix for interfaces: `IShape`, `ILayer`, `ITool`
- Use **PascalCase** for type aliases: `OperationMode`, `Language`
- Use **SCREAMING_SNAKE_CASE** for constants: `LASER_MODES`, `DEFAULT_CONFIG`

### Variables and Functions
- Use **camelCase**: `selectedShapes`, `handleClick`, `isVisible`
- Use **PascalCase** for classes: `PathEditor`, `HistoryManager`, `CanvasRenderer`

## Best Practices

1. **Consistency**: Once a pattern is established, maintain it across the entire codebase.
2. **Clarity**: File names should clearly indicate their purpose and type.
3. **Searchability**: Consistent naming makes it easier to find files.
4. **Tooling**: Many IDEs and build tools work better with consistent naming.

## Migration Notes

When renaming files:
1. Update all import statements
2. Update any references in configuration files (vite.config.ts, tsconfig.json)
3. Test the build to ensure no broken imports
4. Commit renames separately for clarity in git history

---

**Last Updated**: 2025-12-24
