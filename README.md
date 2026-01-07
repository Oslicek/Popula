# Popula

**Demographic modeling engine with geographic flavor**

Popula is a "demographic sandbox" for creating and simulating population projections under various scenarios, including crisis events (pandemics, wars, migration). Built on the Cohort-Component Method (CCM) for demographically sound projections.

## Architecture

```
┌─────────────────┐         ┌─────────────┐         ┌─────────────────┐
│ React Frontend  │◀───────▶│    NATS     │◀───────▶│  Rust Worker    │
│ (TypeScript)    │   WS    │   Server    │  Native │  (CCM Engine)   │
└─────────────────┘         └─────────────┘         └─────────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust with Tokio async runtime
- **Messaging**: NATS (message-driven, no REST APIs)
- **Storage**: Abstracted (Memory/SQLite/DuckDB)

## Quick Start (Windows 11)

### Prerequisites

```powershell
# Node.js 20+
winget install OpenJS.NodeJS.LTS

# pnpm
npm install -g pnpm

# Rust
winget install Rustlang.Rustup
```

### Installation

```powershell
# Clone repository
git clone https://github.com/Oslicek/Popula.git
cd Popula

# Install dependencies
pnpm install

# Build shared types
pnpm --filter @popula/shared-types build
```

### Running

Open 3 terminals:

**Terminal 1 - NATS Server:**
```powershell
.\infra\scripts\start-nats.ps1
```

**Terminal 2 - Rust Worker:**
```powershell
cd worker
cargo run
```

**Terminal 3 - Frontend:**
```powershell
pnpm dev
```

Open http://localhost:5173

## Project Structure

```
Popula/
├── apps/
│   └── web/                # React frontend
├── packages/
│   └── shared-types/       # TypeScript types
├── worker/                 # Rust worker
│   └── src/
│       ├── engine/         # CCM demographic engine
│       ├── handlers/       # NATS message handlers
│       └── storage/        # Storage abstractions
├── infra/
│   └── scripts/            # Development scripts
└── data/                   # Sample datasets
```

## Features

### Demographic Engine (CCM)
- Age-sex cohort projections
- Mortality, fertility, migration modeling
- Shock modifiers (pandemics, wars, crises)

### Scenario Builder
- Define projection parameters
- Add/edit shock modifiers
- Compare multiple scenarios

### Visualization
- Animated population pyramids
- Time-series projections
- Regional comparisons

## Development

### Testing

```powershell
# TypeScript tests
pnpm test

# Rust tests
cd worker
cargo test
```

### Type Safety

Types are shared between TypeScript and Rust via JSON schemas.
See `packages/shared-types/` for canonical type definitions.

## Documentation

- [PROJECT_RULES.md](./PROJECT_RULES.md) - Coding standards and conventions
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Project status and architecture

## Data Sources

- **Population**: UN World Population Prospects (CC-BY)
- **Mortality**: Human Mortality Database (free registration)
- **Fertility**: UN WPP (CC-BY)
- **Migration**: Castro-Rogers model curves (public domain)

## License

MIT

---

*This is Chapter One of the production implementation.*

