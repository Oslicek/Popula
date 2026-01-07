# Project Context

> **Last Updated:** 2026-01-07 (v0.1.0)

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
│       │   │   └── nats.ts         # NATS WebSocket service
│       │   ├── stores/
│       │   │   ├── natsStore.ts    # Connection state
│       │   │   └── scenarioStore.ts
│       │   └── pages/
│       │       ├── Home/           # Main page with ping demo
│       │       └── Scenario/
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
| `useNatsStore` | apps/web/src/stores/ | Connection state (Zustand) |
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

**Phase:** Core Engine Implementation

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
  - Multi-year projections

**Test Coverage:**
- TypeScript: 41 tests passing (shared-types + web)
- Rust: 30 tests passing (CCM + handlers + storage)
- Total: **71 tests**

**In Progress:**
- [ ] Migration component for CCM
- [ ] Shock modifier integration with CCM

**Pending:**
- [ ] Wire CCM engine to NATS scenario handler
- [ ] React frontend scenario builder UI
- [ ] Population pyramid visualization (D3.js)
- [ ] Sample data loading (Czech Republic)

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
   
2. MORTALITY: Apply survival rates
   survivors[age] = population[age] × (1 - mortality_rate[age])
   
3. AGING: Move survivors up one year
   population[age+1, t+1] = survivors[age, t]
   
4. NEWBORNS: Add births at age 0
   population[0, t+1] = births × sex_ratio_split

5. MIGRATION: Add/subtract net migrants (TODO)
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
2. Add migration component to CCM
3. Wire CCM to NATS scenario handler
4. Create React scenario builder UI
5. Build population pyramid visualization (D3.js)
6. Load sample Czech Republic data

---

*This is Chapter One of the production implementation.*
