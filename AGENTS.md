# Agent Guidelines for AgentsOverflow

## Package Manager

- Use `pnpm` instead of `npm`
- Workspace monorepo structure with apps/* and packages/*

## Technology Stack

- **Frontend**: TanStack Start (React + Vite), TanStack Router, TanStack Query
- **Backend**: Convex with better-auth for authentication
- **UI**: ShadcnUI components, Tailwind CSS v4, Radix UI primitives
- **Build**: Turborepo for task orchestration
- **Package**: ES Modules (type: "module")

## Build/Test/Lint Commands

```bash
# Root level - runs across all packages via turbo
pnpm build          # Build all packages
pnpm dev            # Start dev servers
pnpm lint           # Lint all packages (with auto-fix)
pnpm format         # Format all packages
pnpm typecheck      # Type check all packages

# Individual package commands (run from package directory)
pnpm --filter web dev              # Web app dev server
pnpm --filter @workspace/backend dev    # Convex dev server

# Better Auth (backend schema generation)
pnpm --filter @workspace/backend codegen   # Generate Convex types
# For auth table changes, use better-auth-cli to generate new schema
```

## Code Style (Biome)

Configuration in `biome.json`:

- **Formatter**: Enabled, tab indentation
- **Quotes**: Double quotes for JavaScript
- **Imports**: Auto-organize imports enabled
- **CSS**: Tailwind directives supported
- **Ignored**: `apps/web/src/routeTree.gen.ts`

Run before committing:
```bash
pnpm format && pnpm lint
```

## TypeScript Conventions

- Target: ES2022, Module: ESNext, Resolution: bundler
- Strict mode enabled
- Use `.ts` for modules, `.tsx` for React components
- Workspace imports: `@workspace/backend`, `@workspace/ui`

## Naming Conventions

- **Components**: PascalCase (e.g., `Button.tsx`, `UserCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Files**: Use descriptive names, match export name

## Import Guidelines

```typescript
// 1. External dependencies
import { useQuery } from "@tanstack/react-query";

// 2. Workspace packages
import { Button } from "@workspace/ui/components/button";
import { api } from "@workspace/backend/convex/api";

// 3. Internal absolute imports
import { useAuth } from "~/hooks/useAuth";

// 4. Relative imports (only when necessary)
import { utils } from "./utils";
```

## Component Guidelines

- Use ShadcnUI components from `@workspace/ui`
- Do not modify the existing theme
- Use `class-variance-authority` for component variants
- Support Tailwind v4 classes

## Backend (Convex)

- Use `convex dev` for local development
- Run `codegen` after schema changes
- For authentication table changes: use better-auth-cli to generate schema
- Export from `@workspace/backend/convex/*`

## Error Handling

- Use Zod for runtime validation
- Prefer early returns over nested conditionals
- Handle loading/error states in React components

## Git Workflow

1. Run `pnpm format && pnpm lint` before committing
2. Ensure `pnpm typecheck` passes
3. Use conventional commit messages

## Project Structure

```
/
├── apps/
│   ├── web/              # TanStack Start web app
│   └── cli/              # CLI application
├── packages/
│   ├── backend/          # Convex backend + better-auth
│   ├── ui/               # ShadcnUI components
│   └── contracts/        # Shared types/contracts
├── biome.json            # Linting/formatting config
├── turbo.json            # Turborepo config
└── pnpm-workspace.yaml   # Workspace config
```
