# Project Context

> **Last Updated:** 2026-01-09 (v0.3.3)

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
| Visualization | Vega | Charts (line, pyramid, bar) |
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
   │  popula.projection.run  │                           │
   │─────────────────────────▶                           │
   │                         │ popula.projection.run     │
   │                         │──────────────────────────▶│
   │                         │                           │ Load CCM engine
   │                         │                           │ Run year-by-year
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
│       │   │   ├── Layout/
│       │   │   ├── ErrorBoundary.tsx   # Error boundary for charts ✅
│       │   │   └── charts/              # Vega chart components ✅
│       │   │       ├── YearlyChangeChart.tsx
│       │   │       ├── PopulationPyramidChart.tsx
│       │   │       ├── AgeGroupChart.tsx
│       │   │       ├── DependencyRatioChart.tsx
│       │   │       ├── SexRatioChart.tsx
│       │   │       ├── MedianAgeChart.tsx
│       │   │       └── index.ts
│       │   ├── hooks/
│       │   │   ├── useNats.ts      # NATS connection hook
│       │   │   └── useProjection.ts # Projection subscription
│       │   ├── services/
│       │   │   ├── nats.ts         # NATS WebSocket service (chunked encoding)
│       │   │   ├── geoService.ts   # Rust worker geo processing client ✅
│       │   │   └── csvParser.ts    # CSV import parser ✅
│       │   ├── utils/
│       │   │   ├── demographicCalculations.ts  # Calculation utilities ✅
│       │   │   └── csvExport.ts    # CSV/ZIP export utilities ✅
│       │   ├── stores/
│       │   │   ├── natsStore.ts    # Connection state + projection
│       │   │   ├── workspaceStore.ts # Workspace management ✅
│       │   │   └── scenarioStore.ts
│       │   └── pages/
│       │       ├── Home/           # Main page + workspace list ✅
│       │       ├── Workspace/      # Workspace detail page ✅
│       │       ├── Map/            # UK map with population density ✅
│       │       │   ├── Map.tsx
│       │       │   ├── populationData.ts
│       │       │   ├── reprojection.ts
│       │       │   └── types.ts
│       │       └── CzMap/          # CZ map with ZSJ microregions ✅
│       │           ├── CzMap.tsx
│       │           ├── czPopulationData.ts
│       │           ├── reprojectionCz.ts
│       │           ├── vfrToGeojson.ts       # VFR/GML XML parser
│       │           ├── zoomFiltering.ts      # Zoom-based filtering
│       │           └── viewportFiltering.ts  # Viewport culling
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   └── shared-types/               # Shared TypeScript types
│       └── src/
│           ├── demographic.ts      # Cohort, Population, etc.
│           ├── messages.ts         # NATS message envelopes ✅
│           ├── geo.ts              # Geo processing message types ✅
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
│   │   │   ├── projection.rs
│   │   │   └── geo/                # Geographic processing ✅
│   │   │       ├── mod.rs
│   │   │       ├── vfr_parser.rs   # VFR GML XML parser (quick-xml)
│   │   │       └── area_calc.rs    # Polygon area calculation
│   │   ├── handlers/
│   │   │   ├── mod.rs
│   │   │   ├── ping.rs             # Ping/pong demo handler ✅
│   │   │   ├── projection_handler.rs # Projection handler ✅
│   │   │   ├── geo_handler.rs      # VFR XML processing handler ✅
│   │   │   └── scenario.rs
│   │   ├── types/
│   │   │   ├── mod.rs
│   │   │   └── geo.rs              # Geo message types
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
| `NatsService` | apps/web/src/services/ | NATS WebSocket client (chunked encoding for large payloads) |
| `GeoService` | apps/web/src/services/ | Rust worker geo processing client |
| `csvParser` | apps/web/src/services/ | CSV file parsing for imports |
| `useNatsStore` | apps/web/src/stores/ | Connection state + projection |
| `useWorkspaceStore` | apps/web/src/stores/ | Workspace management (Zustand) |
| `Workspace` | apps/web/src/pages/ | Workspace UI with data import |
| `PingHandler` | worker/src/handlers/ | Demo request/reply handler |
| `ProjectionHandler` | worker/src/handlers/ | Run CCM projections via NATS |
| `GeoHandler` | worker/src/handlers/ | VFR XML processing via NATS |
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

**Phase:** Interactive Visualization

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
- [x] **End-to-end projection pipeline**
  - Frontend sends projection request via NATS
  - Rust worker runs CCM engine with real data
  - Worker returns full cohort data per year
  - Frontend displays results with processing stats
- [x] **Interactive visualizations (Vega)**
  - Year-over-Year Change table + line chart (dual Y-axes)
  - Population Pyramid table + pyramid chart
  - Age Group Summary table + stacked bar chart
  - Dependency Ratios table + multi-line chart
  - Sex Ratio table + multi-line chart
  - Cohort Tracking table
  - Median Age Progression table + line chart
  - Life Table (period life expectancy)
  - Year slider with play/pause animation
  - Adjustable animation speed
- [x] **CSV Export**
  - Individual table exports (8 table types)
  - "Export All Reports" button (ZIP archive)
  - JSZip library for client-side ZIP generation
  - Floating-point precision handling
- [x] **Geographic overlay (UK & Czech Republic)**
  - MapLibre OSM basemap with toggle
  - deck.gl regions overlay (UK local authorities, CZ microregions/ZSJ)
  - On-the-fly reprojection from BNG (EPSG:27700) and S-JTSK/Krovak (EPSG:5514) to WGS84
  - Population density choropleth (20-bin quantile scale)
  - Year slider with animation
  - Hover tooltips with population/density/area
  - VFR (GML) XML to GeoJSON converter for Czech data
  - Automatic deduplication of uploaded features (43,795 → 6,732 unique regions)
  - **Performance optimizations** for smooth rendering:
    - Zoom-based filtering: Progressive detail by region area (1% at zoom 6 → 100% at zoom 11+)
    - Viewport-based filtering: Only process features visible in current view (zoom ≥ 9)
    - Cached sorting: Sort once, slice on zoom changes (O(1) instead of O(n log n))
    - Fast bbox calculation: Optimized geometry bounds checking
  - **Rust worker geo processing** (Phase 1):
    - VFR GML XML parsing in Rust (quick-xml) for 340MB+ files
    - Polygon area calculation in Rust (geo crate)
    - Chunked JSON encoding in frontend to avoid memory spikes
    - NATS max payload increased to 500MB for large file transfers
    - Client-side reprojection (proj4) from S-JTSK to WGS84

**Test Coverage:**
- TypeScript: 125 tests (124 passed, 1 skipped)
- Rust: 46 tests passing (CCM + handlers + storage)
- Total: **171 tests**

**In Progress:**
- [ ] Shock modifier integration with CCM

**Pending:**
- [ ] Shock modifier integration with CCM
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
- Result view calculations (age groups, dependency ratios, etc.)

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

## Result Views (Implemented)

| View | Description | Chart Type |
|------|-------------|------------|
| Year-over-Year Change | Population, births, deaths, migration per year | Dual-axis line chart |
| Population Pyramid | Age-sex distribution for a selected year | Horizontal bar (pyramid) |
| Age Group Summary | Policy-relevant age brackets (0-14, 15-24, etc.) | Stacked bar chart |
| Dependency Ratios | Youth, old-age, total dependency over time | Multi-line chart |
| Sex Ratio Analysis | Males per 100 females by age group | Multi-line chart |
| Cohort Tracking | Follow a birth cohort through time | Table only |
| Median Age Progression | Median age trends over projection | Multi-line chart |
| Life Table | Period life expectancy from mortality data | Table only |

## Notes

- Local development on Windows 11
- NATS runs as a single binary (auto-installed to ~/.nats/)
- NATS max_payload configured to 500MB for large VFR XML files
- Storage defaults to in-memory for MVP
- Same code paths for local and production
- CCM (Cohort-Component Method) is the core algorithm
- Max age is 120 (open-ended interval)
- Vega (full version) used for all charts

## Next Steps

1. ~~Implement minimal CCM engine (mortality + aging + fertility)~~ ✅
2. ~~Add migration component to CCM~~ ✅
3. ~~Create workspaces with CSV import~~ ✅
4. ~~Create sample dataset (Humania)~~ ✅
5. ~~Wire CCM to NATS (real projections)~~ ✅
6. ~~Build visualizations (Vega charts)~~ ✅
7. ~~Add more result views (Sex Ratio, Cohort Tracking, Median Age, Life Table)~~ ✅
8. ~~Export results to CSV/ZIP~~ ✅
9. Add shock modifiers (pandemics, wars, crises)
10. Multi-region support

---

*This is Chapter Three of the production implementation.*
