# Project Context

> **Last Updated:** 2026-01-07 (v0.2.0)

## Overview

**Popula** is a demographic modeling engine with a geographic flavor. It provides a "demographic sandbox" for creating and simulating population projections under various scenarios, including crisis events (pandemics, wars, migration). The application uses the Cohort-Component Method (CCM) for demographically sound projections.

**Repository:** https://github.com/Oslicek/Popula

**Vision:** Professional demographic modeling with game-like accessibility.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 19 + TypeScript | User interface |
| Build Tool | Vite 6 | Fast development, HMR |
| Styling | CSS Modules | Scoped styles |
| Visualization | D3.js | Population pyramids, charts |
| State Management | Zustand | Global state (scenarios, results) |
| Message Broker | NATS | Frontend ↔ Worker communication |
| Worker | Rust (Tokio) | Demographic engine, heavy computation |
| Storage | Abstracted (SQLite/DuckDB/NATS) | Persistence layer |
| Testing (TS) | Vitest | Unit + integration tests |
| Testing (Rust) | cargo test | Unit tests |

## Architecture

**Pattern:** Message-Driven Distributed Application

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Windows 11 PC                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐         ┌─────────────┐         ┌─────────────────┐  │
│   │ React Frontend  │◀───────▶│    NATS     │◀───────▶│  Rust Worker    │  │
│   │ (Vite dev)      │   WS    │   Server    │  Native │  (CCM Engine)   │  │
│   │ localhost:5173  │         │  :4222/:8222│         │                 │  │
│   └─────────────────┘         └─────────────┘         └─────────────────┘  │
│                                      │                         │            │
│                                      ▼                         ▼            │
│                               ┌─────────────┐           ┌───────────┐      │
│                               │ JetStream   │           │  Storage  │      │
│                               │ (optional)  │           │  Adapter  │      │
│                               └─────────────┘           └───────────┘      │
│                                                                │            │
│                                                         ┌──────┴──────┐    │
│                                                         │ SQLite/     │    │
│                                                         │ DuckDB/     │    │
│                                                         │ Memory      │    │
│                                                         └─────────────┘    │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Message Flow

```
Frontend                    NATS                    Rust Worker
   │                         │                           │
   │  popula.scenario.submit │                           │
   │─────────────────────────▶                           │
   │                         │ popula.scenario.submit    │
   │                         │──────────────────────────▶│
   │                         │                           │ Validate & store
   │                         │  popula.scenario.accepted │
   │                         │◀──────────────────────────│
   │ popula.scenario.accepted│                           │
   │◀─────────────────────────                           │
   │                         │                           │ Run CCM engine
   │                         │ popula.projection.progress│ (year by year)
   │◀────────────────────────│◀──────────────────────────│
   │                         │                           │
   │                         │  popula.projection.result │
   │◀────────────────────────│◀──────────────────────────│
   │                         │                           │
```

## Domain Model

### Core Types

```typescript
// Cohort: Population by age, gender, region
interface Cohort {
  age: number;        // 0-120
  gender: 'male' | 'female';
  regionId: string;
  count: number;
}

// Population: Collection of cohorts for a point in time
interface Population {
  scenarioId: string;
  year: number;
  cohorts: Cohort[];
  metadata: {
    totalPopulation: number;
    medianAge: number;
  };
}

// Scenario: User-defined projection parameters
interface Scenario {
  id: string;
  name: string;
  baseYear: number;
  endYear: number;
  regions: string[];
  shocks: Shock[];
}

// Shock: Modifier applied to demographic rates
interface Shock {
  id: string;
  name: string;
  type: 'mortality' | 'fertility' | 'migration';
  startYear: number;
  endYear: number;
  targetAges: { min: number; max: number } | 'all';
  targetGenders: ('male' | 'female')[] | 'all';
  modifier: number;  // Multiplier (1.5 = 50% increase)
}
```

## Project Structure

```
Popula/
├── apps/
│   └── web/                        # React frontend
│       ├── public/
│       │   └── sample-data/        # Sample datasets ✅
│       │       ├── population.csv  # Humania age-sex distribution
│       │       ├── mortality.csv   # Death probabilities
│       │       ├── fertility.csv   # Birth rates
│       │       ├── migration.csv   # Net migration
│       │       └── humania.json    # Census metadata
│       ├── src/
│       │   ├── components/
│       │   │   ├── ConnectionStatus/
│       │   │   ├── Header/
│       │   │   ├── Footer/
│       │   │   └── Layout/
│       │   ├── hooks/
│       │   │   ├── useNats.ts      # NATS connection hook
│       │   │   └── useProjection.ts # Projection subscription
│       │   ├── services/
│       │   │   ├── nats.ts         # NATS WebSocket service
│       │   │   └── csvParser.ts    # CSV import parser ✅
│       │   ├── stores/
│       │   │   ├── natsStore.ts    # Connection state
│       │   │   ├── workspaceStore.ts # Workspace management ✅
│       │   │   └── scenarioStore.ts
│       │   └── pages/
│       │       ├── Home/           # Main page + workspace list ✅
│       │       └── Workspace/      # Workspace detail page ✅
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   └── shared-types/               # Shared TypeScript types
│       └── src/
│           ├── demographic.ts      # Cohort, Population, etc.
│           ├── messages.ts         # NATS message envelopes
│           ├── scenario.ts
│           ├── shock.ts            # Shock types & helpers
│           ├── workspace.ts        # Workspace types ✅
│           └── storage.ts
│
├── worker/                         # Rust worker
│   ├── src/
│   │   ├── main.rs
│   │   ├── engine/
│   │   │   ├── mod.rs
│   │   │   ├── types.rs            # Rust demographic types
│   │   │   ├── ccm.rs              # CCM implementation ✅
│   │   │   ├── ccm_tests.rs        # CCM unit tests ✅
│   │   │   └── projection.rs
│   │   ├── handlers/
│   │   │   ├── mod.rs
│   │   │   ├── ping.rs             # Ping/pong demo handler ✅
│   │   │   └── scenario.rs
│   │   └── storage/
│   │       ├── mod.rs
│   │       ├── traits.rs
│   │       └── memory.rs
│   └── Cargo.toml
│
├── infra/
│   ├── nats-server.conf
│   └── scripts/
│       ├── start-nats.ps1          # Auto-installs NATS
│       └── dev.ps1
│
├── data/
│   └── sample/
│       └── cz-population-2024.json
│
├── package.json
├── pnpm-workspace.yaml
├── PROJECT_RULES.md
└── PROJECT_CONTEXT.md
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NatsService` | apps/web/src/services/ | NATS WebSocket client |
| `csvParser` | apps/web/src/services/ | CSV file parsing for imports |
| `useNatsStore` | apps/web/src/stores/ | Connection state (Zustand) |
| `useWorkspaceStore` | apps/web/src/stores/ | Workspace management (Zustand) |
| `Workspace` | apps/web/src/pages/ | Workspace UI with data import |
| `PingHandler` | worker/src/handlers/ | Demo request/reply handler |
| `CohortComponentModel` | worker/src/engine/ccm.rs | CCM implementation |
| `ScenarioHandler` | worker/src/handlers/ | Process scenario messages |
| `Storage` | worker/src/storage/ | DB-agnostic persistence |

## Data Sources

| Data | Source | License |
|------|--------|---------|
| Population by age/gender | UN World Population Prospects | CC-BY |
| Mortality tables | Human Mortality Database | Free (registration) |
| Fertility rates | UN WPP | CC-BY |
| Migration profiles | Castro-Rogers model curves | Public domain |

## Current State

**Phase:** Frontend Integration

**Completed:**
- [x] Project architecture design
- [x] Type definitions (TypeScript + Rust)
- [x] Storage abstraction layer design
- [x] Message schema design
- [x] Project documentation
- [x] Monorepo scaffolding (pnpm workspaces)
- [x] NATS local infrastructure setup (auto-install script)
- [x] Rust worker skeleton
- [x] NATS WebSocket connection (frontend ↔ worker)
- [x] Ping/pong demo (full round-trip working)
- [x] **CCM engine implementation** (TDD)
  - Aging (cohort progression)
  - Mortality (survival rates)
  - Fertility (births with sex ratio)
  - Migration (net migration by age/gender)
  - Multi-year projections
- [x] **Sample dataset: Republic of Humania**
  - 10.2M fictional population
  - Realistic demographic rates
  - 5 CSV/JSON files for testing
- [x] **Workspaces feature**
  - Unlimited workspaces per user
  - CSV file import (population, mortality, fertility, migration)
  - CSV parser with validation (17 unit tests)
  - Projection parameters form
  - Results table display
  - "Load Humania Sample" one-click loading
  - localStorage persistence

**Test Coverage:**
- TypeScript: 58 tests passing (shared-types + web)
- Rust: 38 tests passing (CCM + handlers + storage)
- Total: **96 tests**

**In Progress:**
- [ ] Wire CCM engine to NATS for real projections
- [ ] Shock modifier integration with CCM

**Pending:**
- [ ] Population pyramid visualization (D3.js)
- [ ] Export results to CSV
- [ ] Multi-region support

## Development Setup (Windows 11)

### Prerequisites
```powershell
# Install Node.js (via winget or nvm-windows)
winget install OpenJS.NodeJS.LTS

# Install pnpm
npm install -g pnpm

# Install Rust
winget install Rustlang.Rustup

# Install Visual Studio Build Tools (for Rust MSVC)
winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64"
```

### Running Locally
```powershell
# Terminal 1: Start NATS (auto-installs if needed)
pnpm nats:start
# Or: .\infra\scripts\start-nats.ps1 -Install

# Terminal 2: Start Rust worker
cd worker
cargo run

# Terminal 3: Start frontend
pnpm dev
```

### Running Tests
```powershell
# All tests (TypeScript + Rust)
pnpm test                    # TypeScript tests
cd worker && cargo test      # Rust tests

# Watch mode
pnpm test:watch             # TypeScript
cargo watch -x test         # Rust (requires cargo-watch)
```

## Testing Strategy

**TDD Focus Areas:**
- Demographic calculations (mortality, fertility, aging)
- Shock modifier application
- Year-by-year projection accuracy
- Message serialization/deserialization
- Storage adapter operations

**Test Coverage Goals:**
- TypeScript: 90%+ for shared-types
- Rust engine: 95%+ for calculations
- Integration: Message round-trip tests

## CCM Algorithm (Implemented)

The Cohort-Component Method projects population year-by-year:

```
For each year t → t+1:
1. FERTILITY: Calculate births from women age 15-49
   births = Σ(women[age] × fertility_rate[age])
   
2. MIGRATION: Add/subtract net migrants by age/gender
   population[age] += net_migration[age]
   (emigration capped at available population)
   
3. MORTALITY: Apply survival rates
   survivors[age] = population[age] × (1 - mortality_rate[age])
   
4. AGING: Move survivors up one year
   population[age+1, t+1] = survivors[age, t]
   
5. NEWBORNS: Add births at age 0
   population[0, t+1] = births × sex_ratio_split
```

## Notes

- Local development on Windows 11
- NATS runs as a single binary (auto-installed to ~/.nats/)
- Storage defaults to in-memory for MVP
- Same code paths for local and production
- CCM (Cohort-Component Method) is the core algorithm
- Max age is 120 (open-ended interval)

## Next Steps

1. ~~Implement minimal CCM engine (mortality + aging + fertility)~~ ✅
2. ~~Add migration component to CCM~~ ✅
3. ~~Create workspaces with CSV import~~ ✅
4. ~~Create sample dataset (Humania)~~ ✅
5. Wire CCM to NATS scenario handler (real projections)
6. Build population pyramid visualization (D3.js)
7. Add shock modifiers (pandemics, wars, crises)
8. Export results to CSV/Excel

---

*This is Chapter Two of the production implementation.*
