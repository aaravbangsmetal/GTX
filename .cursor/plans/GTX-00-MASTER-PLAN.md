# GTX — Centralized Master Plan (All Agents Read This First)

## 0. Executive Summary

**GTX** is a browser-based open-world game inspired by **GTA Vice City**. Target: killer Vice City mood (pink sunsets, neon nights, art deco, ocean beach) while staying lightweight enough for 60fps on a mid-range laptop in Chrome.

**Development model:** 10 agents work in **parallel worktrees**, each owning an isolated `src/{module}/` folder. Zero cross-folder edits. Integration happens through **typed contracts** in `src/shared/` (owned exclusively by Agent 1) and a **merge sequence** that never produces file conflicts.

---

## 1. Product Vision

### What We're Building
- Third-person open-world action game in the browser
- Vice City aesthetic: 1980s Miami, pastel buildings, palm-lined coast, neon nightlife
- Core loop: explore city → steal cars → complete missions → evade police
- Playable demo with 3 missions, driving, combat, wanted system, save/load

### What We're NOT Building (v1 scope cut)
- Multiplayer
- Full GTA map scale (we use compact 2km × 2km)
- Licensed Vice City assets/music (inspired style, original assets)
- Mobile touch controls (keyboard/mouse first; gamepad secondary)
- Interiors of buildings

### Performance Targets
| Metric | Target |
|--------|--------|
| FPS | 60 (30 minimum on low-end) |
| Draw calls | < 500 |
| On-screen triangles | < 2M |
| GPU memory | < 150MB |
| Initial load | < 5s on broadband |
| Total asset size | < 80MB compressed |

### Graphics Philosophy: "Light but Killer"
High visual impact comes from **art direction**, not polygon count:
- Stylized low-poly geometry (500-2000 tris per building)
- Baked ambient occlusion in textures
- Instanced props (palms, lamps, parked cars)
- Aggressive LOD (3 levels + impostor billboards)
- Post-processing stack (bloom, color grade, vignette, grain)
- Vice City color grading (teal shadows, warm highlights, pink sky)
- Night neon emissive materials + bloom
- Fog to mask draw distance

---

## 2. Tech Stack (Already Installed)

| Layer | Library | Version |
|-------|---------|---------|
| Build | Vite | ^8.3 |
| Language | TypeScript | ^7.0 (strict) |
| 3D Render | Three.js | ^0.186 |
| Physics | cannon-es | ^0.20 |
| Audio | Howler | ^2.2 |

**Do not add new dependencies** without updating this master plan and `package.json` in a dedicated `chore/deps` PR merged before agent work.

---

## 3. Repository Layout and File Ownership (CONFLICT PREVENTION)

### Golden Rule
> **Each agent may ONLY create/edit files inside their owned directory and `public/assets/{their-folder}/`.**
> **Exception:** Agent 1 also owns `src/shared/`, `src/main.ts`, `src/style.css`, and `index.html`.

### Ownership Matrix

| Path | Owner | Other Agents |
|------|-------|-------------|
| `src/shared/` | Agent 1 ONLY | Import only, never edit |
| `src/core/` | Agent 1 | Never touch |
| `src/renderer/` | Agent 2 | Never touch |
| `src/world/` | Agent 3 | Never touch |
| `src/physics/` | Agent 4 | Never touch |
| `src/player/` | Agent 5 | Never touch |
| `src/vehicles/` | Agent 6 | Never touch |
| `src/ai/` | Agent 7 | Never touch |
| `src/audio/` | Agent 8 | Never touch |
| `src/ui/` | Agent 9 | Never touch |
| `src/gameplay/` | Agent 10 | Never touch |
| `src/main.ts` | Agent 1 | Never touch |
| `public/assets/core/` | Agent 1 | — |
| `public/assets/renderer/` | Agent 2 | — |
| `public/assets/world/` | Agent 3 | — |
| `public/assets/physics/` | Agent 4 | — |
| `public/assets/player/` | Agent 5 | — |
| `public/assets/vehicles/` | Agent 6 | — |
| `public/assets/ai/` | Agent 7 | — |
| `public/assets/audio/` | Agent 8 | — |
| `public/assets/ui/` | Agent 9 | — |
| `public/assets/gameplay/` | Agent 10 | — |

### Module Export Pattern (Every Agent)
Each agent folder MUST have an `index.ts` that exports ONLY the public API:

```typescript
// Example: src/renderer/index.ts
export { RendererSystem } from './RendererSystem';
export { MaterialLibrary } from './MaterialLibrary';
export type { RendererConfig, DayNightState } from './types';
```

Other agents import via path alias:
```typescript
import { RendererSystem } from '../renderer';  // NOT deep imports
```

### System Registration Pattern (No main.ts conflicts)
Agent 1's `main.ts` imports factory functions. Each agent provides:

```typescript
// src/{module}/createSystem.ts
import type { GameContext } from '../shared/types';
import type { System } from '../shared/types';

export function createXSystem(ctx: GameContext): System {
  return new XSystem(ctx);
}
```

Agent 1 registers in order (final integration):
```typescript
registry.register(createRendererSystem(ctx));  // Agent 2
registry.register(createWorldSystem(ctx));     // Agent 3
// ... etc
```

During parallel dev, Agent 1 uses **stubs** for systems not yet merged.

---

## 4. Shared Contracts (src/shared/ — Agent 1 Defines)

### 4.1 Coordinate System and Units
- **Handedness:** Right-handed, Y-up (Three.js default)
- **Units:** 1 unit = 1 meter
- **Map origin:** (0, 0, 0) = center of Downtown
- **Map bounds:** X: -1000 to +1000, Z: -1000 to +1000
- **Ocean:** East side (positive X), water level Y = 0
- **Gravity:** -9.82 m/s² on Y axis

### 4.2 Core Types (src/shared/types.ts)

```typescript
export type EntityId = number;
export type SystemName =
  | 'core' | 'renderer' | 'world' | 'physics'
  | 'player' | 'vehicles' | 'ai' | 'audio' | 'ui' | 'gameplay';

export interface Vec3 { x: number; y: number; z: number; }
export interface Quat { x: number; y: number; z: number; w: number; }

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  events: EventBus;
  registry: SystemRegistry;
  assets: AssetLoader;
  getSystem<T extends System>(name: SystemName): T;
}

export interface System {
  readonly name: SystemName;
  init(ctx: GameContext): Promise<void>;
  fixedUpdate(dt: number): void;   // 60Hz physics tick
  update(dt: number): void;        // variable render tick
  dispose(): void;
}

export interface SystemRegistry {
  register(system: System): void;
  get<T extends System>(name: SystemName): T;
  getAll(): System[];
}

export enum GameState {
  LOADING, MENU, PLAYING, PAUSED, CUTSCENE, GAME_OVER
}

export enum DistrictId {
  OCEAN_BEACH, DOWNTOWN, LITTLE_HAVANA, VICE_PORT, STARFISH_ISLAND
}

export interface PlayerStateSnapshot {
  health: number;       // 0-100
  armor: number;        // 0-100
  money: number;
  wantedLevel: number;  // 0-5
  weaponId: string | null;
  position: Vec3;
  isInVehicle: boolean;
  vehicleId: EntityId | null;
}
```

### 4.3 Event Bus Catalog (src/shared/events.ts)

Every event is typed. Payload shapes are **immutable contracts**.

| Event | Payload | Emitter | Listeners |
|-------|---------|---------|-----------|
| `game:init` | `{ }` | Agent 1 | All |
| `game:ready` | `{ }` | Agent 1 | All |
| `game:tick` | `{ delta: number; elapsed: number; fixedDelta: number }` | Agent 1 | All |
| `game:stateChange` | `{ from: GameState; to: GameState }` | Agent 1 | 8, 9 |
| `game:pause` | `{ }` | Agent 1/9 | All |
| `game:resume` | `{ }` | Agent 1/9 | All |
| `world:timeChange` | `{ hour: number; isNight: boolean; sunAngle: number }` | Agent 2 | 3, 8 |
| `world:chunkLoaded` | `{ chunkId: string; district: DistrictId }` | Agent 3 | 4, 7 |
| `world:chunkUnloaded` | `{ chunkId: string }` | Agent 3 | 4, 7 |
| `world:playerDistrictChange` | `{ district: DistrictId }` | Agent 3 | 8 |
| `physics:bodyCreated` | `{ entityId: EntityId; bodyId: number }` | Agent 4 | 5, 6, 7 |
| `physics:collision` | `{ entityA: EntityId; entityB: EntityId; point: Vec3; impulse: number }` | Agent 4 | 6, 8, 10 |
| `player:spawn` | `{ entityId: EntityId; position: Vec3 }` | Agent 5 | 3, 8, 9, 10 |
| `player:move` | `{ position: Vec3; velocity: Vec3; isGrounded: boolean }` | Agent 5 | 3, 7 |
| `player:stateChange` | `{ state: PlayerStateSnapshot }` | Agent 5 | 9, 10 |
| `player:death` | `{ position: Vec3; cause: string }` | Agent 5/10 | 7, 8, 9 |
| `player:enterVehicle` | `{ playerId: EntityId; vehicleId: EntityId; seat: 'driver' \| 'passenger' }` | Agent 5/6 | 6, 8, 9 |
| `player:exitVehicle` | `{ playerId: EntityId; vehicleId: EntityId; position: Vec3 }` | Agent 5/6 | 6, 8, 9 |
| `player:interactPrompt` | `{ text: string; targetId: EntityId \| null }` | Agent 5/6 | 9 |
| `vehicle:spawn` | `{ vehicleId: EntityId; type: string; position: Vec3 }` | Agent 6/7 | 8 |
| `vehicle:destroy` | `{ vehicleId: EntityId }` | Agent 6 | 7, 8 |
| `vehicle:enginePitch` | `{ vehicleId: EntityId; rpm: number; speed: number }` | Agent 6 | 8 |
| `vehicle:speedChange` | `{ vehicleId: EntityId; speedKmh: number }` | Agent 6 | 9 |
| `ai:npcSpawn` | `{ npcId: EntityId; type: string }` | Agent 7 | 8 |
| `ai:npcDeath` | `{ npcId: EntityId; position: Vec3 }` | Agent 7/10 | 8, 10 |
| `audio:volumeChange` | `{ group: string; value: number }` | Agent 8/9 | 8 |
| `ui:notification` | `{ text: string; type: 'info' \| 'success' \| 'warning' \| 'error'; duration: number }` | Any | 9 |
| `mission:start` | `{ missionId: string; title: string; objective: string }` | Agent 10 | 9, 8 |
| `mission:update` | `{ missionId: string; progress: number; objective: string }` | Agent 10 | 9 |
| `mission:complete` | `{ missionId: string; reward: number }` | Agent 10 | 8, 9 |
| `mission:fail` | `{ missionId: string; reason: string }` | Agent 10 | 8, 9 |
| `wanted:levelChange` | `{ level: number; previousLevel: number }` | Agent 10 | 7, 8, 9 |
| `combat:shoot` | `{ origin: Vec3; direction: Vec3; weaponId: string }` | Agent 10 | 4, 7, 8 |
| `combat:hit` | `{ targetId: EntityId; damage: number; position: Vec3 }` | Agent 10 | 7, 8 |
| `pickup:collected` | `{ type: string; value: number }` | Agent 10 | 8, 9 |
| `save:complete` | `{ slot: number }` | Agent 10 | 9 |
| `save:loaded` | `{ slot: number }` | Agent 10 | 5, 9 |

### 4.4 Constants (src/shared/constants.ts)

```typescript
export const PHYSICS_TICK_RATE = 60;           // Hz
export const MAX_DELTA_TIME = 0.05;            // 50ms cap
export const WORLD_SIZE = 2000;                // meters
export const CHUNK_SIZE = 128;                 // meters
export const CHUNK_LOAD_RADIUS = 3;            // chunks
export const CHUNK_UNLOAD_RADIUS = 4;          // chunks
export const PLAYER_SPAWN = { x: 200, y: 2, z: -150 }; // Ocean Beach
export const MAX_DRAW_CALLS = 500;
export const MAX_TRIANGLES = 2_000_000;
export const DAY_LENGTH_MINUTES = 24;          // real minutes for full cycle
export const WANTED_MAX_LEVEL = 5;
export const MAX_TRAFFIC_VEHICLES = 15;
export const MAX_PEDESTRIANS = 20;
export const INTERACTION_RADIUS = 3;           // meters
export const VEHICLE_ENTER_RADIUS = 4;         // meters
```

### 4.5 Service Locator Interfaces (src/shared/services.ts)

Agents access other systems ONLY through these read-only service interfaces (implemented by owner agent):

```typescript
// Renderer service (Agent 2 implements)
export interface IRendererService {
  getScene(): THREE.Scene;
  getActiveCamera(): THREE.Camera;
  getRenderer(): THREE.WebGLRenderer;
  addToScene(object: THREE.Object3D, layer?: RenderLayer): void;
  removeFromScene(object: THREE.Object3D): void;
  getMaterial(id: string): THREE.Material;
  getDayNightState(): DayNightState;
}

// Physics service (Agent 4 implements)
export interface IPhysicsService {
  createBody(config: BodyConfig): number;
  removeBody(bodyId: number): void;
  raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null;
  getBodyTransform(bodyId: number): Transform;
  setBodyTransform(bodyId: number, transform: Transform): void;
}

// World service (Agent 3 implements)
export interface IWorldService {
  getRoadNetwork(): RoadNetworkData;
  getMinimapData(): MinimapData;
  getDistrictAt(position: Vec3): DistrictId;
  getSpawnPoint(id: string): Vec3;
  getCollisionData(chunkId: string): CollisionChunkData;
}

// Player service (Agent 5 implements)
export interface IPlayerService {
  getState(): PlayerStateSnapshot;
  getEntityId(): EntityId;
  getPosition(): Vec3;
  isControllable(): boolean;
  teleport(position: Vec3): void;
}

// Vehicle service (Agent 6 implements)
export interface IVehicleService {
  getVehicle(entityId: EntityId): VehicleSnapshot | null;
  getPlayerVehicle(): EntityId | null;
  getNearbyVehicles(position: Vec3, radius: number): EntityId[];
  spawnVehicle(type: string, position: Vec3): EntityId;
}
```

---

## 5. Vice City Visual Bible (All Visual Agents)

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| VicePink | `#FF6B9D` | Sky dusk, UI accents |
| ViceOrange | `#FF8C42` | Sunset horizon |
| VicePurple | `#7B4FBF` | Night sky top |
| ViceTeal | `#2DD4BF` | HUD, water tint |
| ViceCoral | `#FF7F7F` | Building accent |
| ViceMint | `#98D8C8` | Building accent |
| ViceCream | `#FFF5E6` | Building base |
| ViceSalmon | `#FA8072` | Building accent |
| AsphaltDark | `#2A2A2E` | Roads |
| NeonPink | `#FF1493` | Emissive signs |
| NeonBlue | `#00BFFF` | Emissive signs |
| OceanDeep | `#1A5276` | Water |

### Time of Day Presets
| Hour | Sky | Sun Color | Ambient | Bloom |
|------|-----|-----------|---------|-------|
| 06:00 | Pink-orange gradient | `#FFD700` | 0.4 | 0.1 |
| 12:00 | Bright blue | `#FFFFFF` | 0.8 | 0.0 |
| 18:00 | Hot pink/purple | `#FF6B35` | 0.5 | 0.3 |
| 22:00 | Deep blue/purple | `#4A00E0` | 0.15 | 0.5 |
| 02:00 | Near black + neon | `#1A1A2E` | 0.1 | 0.6 |

### District Identity
| District | Buildings | Props | Ambient Audio | NPC Density |
|----------|-----------|-------|---------------|-------------|
| Ocean Beach | 2-3 story motels, art deco hotels | Palms, beach umbrellas, lifeguard towers | Ocean waves, seagulls | Medium |
| Downtown | 6-12 story art deco towers | Neon signs, street lamps, benches | City hum, traffic | High |
| Little Havana | 2-4 story colorful row houses | Fruit stands, murals, cafes | Latin music distant, chatter | High |
| Vice Port | Warehouses, cranes, docks | Shipping containers, forklifts | Seagulls, industrial clank | Low |
| Starfish Island | Mansions, gated drives | Yachts, tennis courts, luxury cars | Quiet, fountain | Low |

---

## 6. Map Layout (2km × 2km)

```
                    N (+Z)
                      ↑
    ┌─────────────────────────────────────┐
    │         STARFISH ISLAND (N)         │
    │         wealthy, mansions, yachts   │
    ├─────────────────────────────────────┤
    │                                     │
    │  LITTLE HAVANA (W)    DOWNTOWN (C)  │
    │  dense colorful       tall art deco │
    │                                     │
    ├──────────────────┬──────────────────┤
    │                  │                  │
    │  VICE PORT (SW)  │  OCEAN BEACH (E) │
    │  docks, cranes   │  coast, palms    │
    │                  │  ████████████████│→ OCEAN
    └──────────────────┴──────────────────┘
    W (-X)                              E (+X)
```

### Chunk Grid
- 16 × 16 chunks (128m each) = 2048m total
- Chunk ID format: `chunk_{x}_{z}` (e.g. `chunk_8_4`)
- Player spawn chunk: `chunk_10_3` (Ocean Beach)

### Key Locations (world coordinates)
| Location | Position (x, y, z) | Purpose |
|----------|-------------------|---------|
| Player spawn | (200, 2, -150) | Ocean Beach parking lot |
| Mission 1 target | (-50, 2, 100) | Downtown marker |
| Mission 2 area | (-400, 2, 50) | Little Havana |
| Mission 3 pickup | (-300, 2, -400) | Vice Port |
| Mission 3 delivery | (100, 2, 600) | Starfish Island |
| Police station | (-100, 2, 0) | Downtown |
| Hospital | (150, 2, -50) | Ocean Beach |

---

## 7. System Update Order (Fixed — Do Not Change)

```
1. physics     (Agent 4) — fixedUpdate only
2. player      (Agent 5) — fixedUpdate: movement forces
3. vehicles    (Agent 6) — fixedUpdate: vehicle physics
4. ai          (Agent 7) — fixedUpdate: NPC/traffic logic
5. gameplay    (Agent 10) — fixedUpdate: combat, missions
---
6. world       (Agent 3) — update: chunk streaming
7. player      (Agent 5) — update: camera, animations
8. vehicles    (Agent 6) — update: visual sync
9. ai          (Agent 7) — update: NPC visuals
10. gameplay   (Agent 10) — update: pickups, markers
11. audio      (Agent 8) — update: 3D audio positions
12. ui         (Agent 9) — update: HUD refresh
13. renderer   (Agent 2) — update: render + post-processing (LAST)
```

---

## 8. Branch Strategy and Merge Sequence

### Branch Naming
```
agent-01-core
agent-02-renderer
agent-03-world
agent-04-physics
agent-05-player
agent-06-vehicles
agent-07-ai
agent-08-audio
agent-09-ui
agent-10-gameplay
integration/wave-1
integration/wave-2
integration/final
```

### Merge Order (Zero Conflicts by Design)
Each merge only touches files in the merged agent's folder + Agent 1 updates `main.ts` registration.

```
main
 └─ agent-01-core          (MUST merge first — creates shared/)
     └─ integration/wave-1
         ├─ agent-02-renderer   (parallel merge, no conflict)
         ├─ agent-03-world      (parallel merge, no conflict)
         └─ agent-04-physics    (parallel merge, no conflict)
     └─ integration/wave-2
         ├─ agent-05-player
         ├─ agent-06-vehicles
         ├─ agent-07-ai
         └─ agent-08-audio
     └─ integration/wave-3
         ├─ agent-09-ui
         └─ agent-10-gameplay
     └─ integration/final     (smoke test + perf pass)
```

### main.ts Merge Protocol
Only Agent 1 edits `main.ts`. When merging agent N:
1. Agent N's branch has NO main.ts changes
2. Integration branch adds ONE import line + ONE register line to main.ts
3. Example merge commit for Agent 2:
```typescript
import { createRendererSystem } from './renderer';
// in init():
registry.register(createRendererSystem(ctx));
```

### Stub Strategy (Parallel Development Before Merge)
Agents 5-10 can develop against **mock implementations** in their own `__mocks__/` subfolder:

```typescript
// src/player/__mocks__/MockPhysicsService.ts
export const mockPhysics: IPhysicsService = {
  createBody: () => 1,
  raycast: () => null,
  // ...
};
```

Delete `__mocks__/` folders during integration.

---

## 9. Agent Launch Waves

| Wave | Agents | Prerequisite | Can Mock |
|------|--------|-------------|----------|
| Wave 1 | 1, 2, 3, 4 | None | Agent 1 stubs for 2-10 |
| Wave 2 | 5, 6, 7, 8 | Wave 1 merged to integration/wave-1 | 5-8 mock each other |
| Wave 3 | 9, 10 | Wave 2 merged + player spawn works | 9 mocks player state |

### Parallel Worktree Commands
```bash
# From main repo root
git worktree add ../gtx-agent-02 -b agent-02-renderer
git worktree add ../gtx-agent-03 -b agent-03-world
# Each agent works in their worktree, pushes to their branch
```

---

## 10. Integration Smoke Test (Final)

After all agents merge to `integration/final`:

1. **Boot:** `npm run dev` → loading screen → game starts, no console errors
2. **Spawn:** Player appears at Ocean Beach, pink sunset sky visible
3. **Walk:** WASD movement, camera follows, collision with buildings
4. **Drive:** Enter parked car (E), drive to Downtown, speedometer shows
5. **AI:** Traffic on roads, pedestrians on sidewalks
6. **Combat:** Shoot NPC, wanted stars appear, police chase
7. **Mission:** Complete "Welcome to Vice City" mission
8. **Audio:** Music on foot, radio in car, engine sound
9. **UI:** HUD shows health/money/minimap, pause menu works
10. **Save:** Save game, reload page, position/stats restored
11. **Perf:** F3 overlay shows 60fps, <500 draw calls in Downtown

---

## 11. Individual Agent Plans

Each agent has a dedicated plan file. **Read this master plan first**, then your agent plan only.

| Agent | Plan File | Module |
|-------|-----------|--------|
| 1 | [GTX-01-AGENT-CORE.md](./GTX-01-AGENT-CORE.md) | `src/core/` + `src/shared/` |
| 2 | [GTX-02-AGENT-RENDERER.md](./GTX-02-AGENT-RENDERER.md) | `src/renderer/` |
| 3 | [GTX-03-AGENT-WORLD.md](./GTX-03-AGENT-WORLD.md) | `src/world/` |
| 4 | [GTX-04-AGENT-PHYSICS.md](./GTX-04-AGENT-PHYSICS.md) | `src/physics/` |
| 5 | [GTX-05-AGENT-PLAYER.md](./GTX-05-AGENT-PLAYER.md) | `src/player/` |
| 6 | [GTX-06-AGENT-VEHICLES.md](./GTX-06-AGENT-VEHICLES.md) | `src/vehicles/` |
| 7 | [GTX-07-AGENT-AI.md](./GTX-07-AGENT-AI.md) | `src/ai/` |
| 8 | [GTX-08-AGENT-AUDIO.md](./GTX-08-AGENT-AUDIO.md) | `src/audio/` |
| 9 | [GTX-09-AGENT-UI.md](./GTX-09-AGENT-UI.md) | `src/ui/` |
| 10 | [GTX-10-AGENT-GAMEPLAY.md](./GTX-10-AGENT-GAMEPLAY.md) | `src/gameplay/` |

---

## 12. Prompt Template for Each Worktree Agent

Copy-paste this into each agent worktree, replacing `{N}` and `{MODULE}`:

```
You are Agent {N} building GTX (browser GTA Vice City game).

READ FIRST: .cursor/plans/GTX-00-MASTER-PLAN.md (central context)
THEN READ: .cursor/plans/GTX-{N}-AGENT-{MODULE}.md (your full spec)

RULES:
- ONLY edit files in your owned folder: src/{module}/ and public/assets/{module}/
- Agent 1 also owns src/shared/ and src/main.ts — you must NOT touch these
- Import shared types from src/shared/ — never duplicate them
- Implement the System interface and export via createXSystem() factory
- Use the event bus for all cross-module communication — no direct imports between agent modules
- Use service interfaces (IRendererService, etc.) to read from other systems
- Include __mocks__/ for dependencies not yet merged
- Match TypeScript strict mode — npm run build must pass

Deliver everything in your agent plan's file checklist. Do not implement other agents' work.
```
