# Project Rules

## Software Engineering Principles

### Test-Driven Development (TDD)
1. **Red**: Write a failing test first
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green
4. **Commit**: Commit and push the code to GitHub
5. **Update PROJECT_CONTEXT**: Update PROJECT_CONTEXT file

### SOLID Principles
- **S**ingle Responsibility: Each module/function should have one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for their base types
- **I**nterface Segregation: Many specific interfaces over one general-purpose interface
- **D**ependency Inversion: Depend on abstractions, not concretions

### General Best Practices
- Keep functions small and focused (< 20 lines ideal)
- Meaningful naming over comments
- DRY (Don't Repeat Yourself) - but don't over-abstract prematurely
- YAGNI (You Aren't Gonna Need It) - implement only what's needed now
- Fail fast - validate inputs early, throw meaningful errors
- Prefer composition over inheritance
- Prefer pure functions where possible

---

## Architecture Principles

### Message-Driven Design
- All frontend-backend communication via NATS messages
- No REST APIs or direct database calls from frontend
- Jobs are fire-and-forget with progress callbacks
- Idempotent message handlers (safe to replay)

### Storage Abstraction
- All persistence through repository interfaces
- Never depend on specific database implementation
- Storage adapters implement common traits/interfaces
- Same interfaces in TypeScript and Rust

### Separation of Concerns
```
┌─────────────────────┐
│   React Frontend    │  UI only, no business logic
└─────────────────────┘
          │
          ▼ (NATS messages)
┌─────────────────────┐
│    Rust Worker      │  Demographic engine + persistence
└─────────────────────┘
          │
          ▼ (Storage traits)
┌─────────────────────┐
│   Storage Adapter   │  SQLite/DuckDB/NATS JetStream
└─────────────────────┘
```

---

## TypeScript Conventions

### Naming
- `PascalCase`: Types, interfaces, classes, enums, React components
- `camelCase`: Variables, functions, parameters, properties
- `UPPER_SNAKE_CASE`: Constants, environment variables
- `IPascalCase` or `PascalCase`: Interfaces (be consistent)

### Code Style
- Use `const` by default, `let` when reassignment needed, never `var`
- Prefer `type` for unions/primitives, `interface` for object shapes
- Use explicit return types for public functions
- Prefer `unknown` over `any`, narrow types explicitly
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer `readonly` for immutable properties
- Use discriminated unions for state management

### Functions
- Prefer arrow functions for callbacks and inline functions
- Use named function declarations for top-level functions
- Prefer async/await over raw Promises
- Avoid nested callbacks (callback hell)

### Error Handling
- Use specific error types or error codes
- Prefer Result types for expected failures (optional)
- Use try/catch for unexpected errors
- Always handle Promise rejections

---

## Rust Conventions

### Naming
- `PascalCase`: Types, traits, structs, enums
- `snake_case`: Functions, variables, modules, file names
- `SCREAMING_SNAKE_CASE`: Constants, statics
- `_prefix`: Unused variables (e.g., `_unused`)

### Code Style
- Prefer `Result<T, E>` over panics for recoverable errors
- Use `?` operator for error propagation
- Prefer `impl Trait` for return types when possible
- Use `#[derive(...)]` liberally (Clone, Debug, Serialize, etc.)
- Prefer iterators over manual loops
- Use `clippy` and fix all warnings

### Async Patterns
- Use `tokio` as async runtime
- Prefer `async-trait` for async trait methods
- Use `Arc<RwLock<T>>` for shared mutable state
- Avoid blocking operations in async contexts

### Error Handling
- Define domain-specific error enums with `thiserror`
- Use `anyhow` for application-level errors (main, handlers)
- Log errors with `tracing`, not `println!`

---

## React Conventions

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types
interface Props {
  scenarioId: string;
}

// 3. Component
export function ProjectionViewer({ scenarioId }: Props) {
  // 4. Hooks (custom hooks first)
  const { projection, isLoading } = useProjection(scenarioId);
  const [selectedYear, setSelectedYear] = useState(2024);
  
  // 5. Effects
  useEffect(() => {
    // ...
  }, [scenarioId]);
  
  // 6. Handlers
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };
  
  // 7. Render
  return <div>{/* ... */}</div>;
}
```

### Best Practices
- One component per file
- Use function components with hooks (no class components)
- Extract custom hooks for reusable logic (`use` prefix)
- Colocate related files (component, styles, tests)
- Prefer controlled components over uncontrolled
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passed to children

### State Management
- Use local state for UI-only concerns
- Lift state up when shared between siblings
- Use Zustand for global state (scenarios, projections)
- NATS messages for server-synchronized state

---

## Message Conventions

### Subject Naming
```
popula.<domain>.<action>
popula.<domain>.<id>.<event>
```

Examples:
- `popula.scenario.submit` - Submit a new scenario
- `popula.scenario.abc123.accepted` - Scenario accepted
- `popula.projection.abc123.progress` - Projection progress update
- `popula.projection.abc123.result` - Final projection result

### Message Payload Structure
```typescript
interface Message<T> {
  id: string;           // Unique message ID (UUID)
  timestamp: string;    // ISO 8601 timestamp
  correlationId: string; // Links related messages
  payload: T;           // Domain-specific data
}
```

### Error Messages
```typescript
interface ErrorMessage {
  id: string;
  timestamp: string;
  correlationId: string;
  error: {
    code: string;       // Machine-readable code
    message: string;    // Human-readable message
    details?: unknown;  // Additional context
  };
}
```

---

## Testing

### Framework
- **Vitest** for TypeScript unit tests
- **React Testing Library** for component tests
- **cargo test** for Rust unit tests
- **Playwright** for E2E tests (if needed)

### Unit Tests
- One assertion per test (when practical)
- Use AAA pattern: Arrange, Act, Assert
- Name tests: `describe('functionName')` + `it('should do X when Y')`
- Mock external dependencies (NATS, storage)
- Test edge cases and error conditions

### Test File Structure
```
# TypeScript
packages/shared-types/src/
├── demographic.ts
└── demographic.test.ts

# Rust
worker/src/engine/
├── projection.rs
└── projection_test.rs  # or #[cfg(test)] mod tests
```

### What to Test
- **Demographic engine**: All calculations (mortality, fertility, migration)
- **Message handlers**: Request → response flow
- **Storage adapters**: CRUD operations
- **Type conversions**: TS ↔ Rust serialization

### What NOT to Test
- Framework code (React, Tokio)
- Third-party libraries (NATS client)
- Pure UI styling
- Implementation details

---

## Project Structure

```
Popula/
├── apps/
│   └── web/                    # React frontend (Vite)
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom hooks (useNats, useProjection)
│       │   ├── stores/         # Zustand stores
│       │   └── pages/          # Route pages
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── shared-types/           # TypeScript type definitions
│   │   └── src/
│   │       ├── demographic.ts  # Domain types
│   │       ├── messages.ts     # Message payloads
│   │       └── storage.ts      # Storage interfaces
│   └── storage/                # TypeScript storage adapters
│       └── src/
│           └── adapters/
│
├── worker/                     # Rust worker
│   ├── src/
│   │   ├── main.rs
│   │   ├── engine/             # Demographic engine (CCM)
│   │   ├── handlers/           # Message handlers
│   │   └── storage/            # Storage traits + adapters
│   └── Cargo.toml
│
├── infra/                      # Local infrastructure
│   ├── nats-server.conf
│   └── scripts/
│       ├── start-nats.ps1      # Start NATS on Windows
│       └── dev.ps1             # Start all services
│
├── data/                       # Sample datasets
│   └── sample/
│
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── PROJECT_RULES.md
└── PROJECT_CONTEXT.md
```

---

## Git Workflow

- Write meaningful commit messages
- Commit small, focused changes
- Keep `main` branch stable
- Use feature branches for new work
- Squash commits before merging when appropriate
- Update PROJECT_CONTEXT.md after significant changes

---

## Windows Development

### Required Tools
- Node.js 20+ (via nvm-windows or direct install)
- pnpm (preferred) or npm
- Rust toolchain (via rustup)
- NATS server (single binary, no install needed)

### PowerShell Scripts
- `.\infra\scripts\start-nats.ps1` - Start NATS server
- `.\infra\scripts\dev.ps1` - Start all services (NATS + worker + frontend)

### File Paths
- Use forward slashes in code (`src/engine/mod.rs`)
- PowerShell handles both (prefer `/` for cross-platform)
- Never hardcode `C:\` paths

---

## Code Review Checklist

- [ ] Tests included and passing (TDD)
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling appropriate
- [ ] No unused code or imports
- [ ] Naming is clear and consistent
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] TypeScript strict mode satisfied
- [ ] Rust clippy warnings addressed
- [ ] Message schemas documented
- [ ] Storage operations use traits (not concrete implementations)

