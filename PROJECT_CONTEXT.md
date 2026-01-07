# Project Context

> **Last Updated:** 2026-01-06 (v0.1.0)

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
│       │   │   ├── PopulationPyramid/
│       │   │   ├── ScenarioBuilder/
│       │   │   └── ProjectionTimeline/
│       │   ├── hooks/
│       │   │   ├── useNats.ts      # NATS connection
│       │   │   └── useProjection.ts # Projection subscription
│       │   ├── stores/
│       │   │   └── scenarioStore.ts
│       │   └── pages/
│       │       ├── Home/
│       │       └── Scenario/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── shared-types/               # Shared TypeScript types
│   │   └── src/
│   │       ├── demographic.ts
│   │       ├── messages.ts
│   │       └── storage.ts
│   └── storage/                    # TS storage adapters
│
├── worker/                         # Rust worker
│   ├── src/
│   │   ├── main.rs
│   │   ├── engine/
│   │   │   ├── mod.rs
│   │   │   ├── types.rs
│   │   │   ├── population.rs
│   │   │   └── projection.rs       # CCM implementation
│   │   ├── handlers/
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
│       ├── start-nats.ps1
│       └── dev.ps1
│
├── data/
│   └── sample/
│       ├── cz-population-2024.json
│       ├── cz-mortality-2024.json
│       └── cz-fertility-2024.json
│
├── package.json
├── pnpm-workspace.yaml
├── PROJECT_RULES.md
└── PROJECT_CONTEXT.md
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PopulationPyramid` | apps/web/src/components/ | Animated age-gender pyramid |
| `ScenarioBuilder` | apps/web/src/components/ | Create/edit scenarios with shocks |
| `ProjectionTimeline` | apps/web/src/components/ | Scrub through projection years |
| `useNats` | apps/web/src/hooks/ | NATS WebSocket connection |
| `useProjection` | apps/web/src/hooks/ | Subscribe to projection results |
| `DemographicEngine` | worker/src/engine/ | CCM implementation |
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

**Phase:** MVP Scaffolding

**Completed:**
- [x] Project architecture design
- [x] Type definitions (TypeScript + Rust)
- [x] Storage abstraction layer design
- [x] Message schema design
- [x] Project documentation (PROJECT_RULES.md, PROJECT_CONTEXT.md)

**In Progress:**
- [ ] Monorepo scaffolding (pnpm workspaces)
- [ ] NATS local infrastructure setup
- [ ] Rust worker skeleton

**Pending:**
- [ ] CCM engine implementation
- [ ] React frontend
- [ ] Population pyramid visualization
- [ ] Scenario builder UI
- [ ] Sample data (Czech Republic)

## Development Setup (Windows 11)

### Prerequisites
```powershell
# Install Node.js (via winget or nvm-windows)
winget install OpenJS.NodeJS.LTS

# Install pnpm
npm install -g pnpm

# Install Rust
winget install Rustlang.Rustup

# Download NATS server
# https://github.com/nats-io/nats-server/releases
# Extract to C:\Tools\nats\ or add to PATH
```

### Running Locally
```powershell
# Terminal 1: Start NATS
.\infra\scripts\start-nats.ps1

# Terminal 2: Start Rust worker
cd worker
cargo run

# Terminal 3: Start frontend
cd apps/web
pnpm dev
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

## Notes

- Local development on Windows 11
- NATS runs as a single binary (no Docker required)
- Storage defaults to in-memory for MVP
- Same code paths for local and production
- CCM (Cohort-Component Method) is the core algorithm

## Next Steps

1. Initialize monorepo structure
2. Install NATS and verify connectivity
3. Create shared-types package with demographic types
4. Scaffold Rust worker with async-nats
5. Implement minimal CCM engine (mortality + aging)
6. Create React app with NATS hook
7. Build population pyramid visualization

---

*This is Chapter One of the production implementation.*
