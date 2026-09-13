# Agent 1: Core Engine and Architecture

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 1 |
| Branch | `agent-01-core` |
| Owns | `src/shared/`, `src/core/`, `src/main.ts`, `src/style.css`, `index.html` |
| Merge order | **FIRST** (all other agents depend on shared contracts) |
| Wave | 1 |

---

## Central Context (What Is Happening)

GTX is a browser GTA Vice City game. The repo is an empty Vite scaffold. **You are the foundation.** Every other agent waits on your `src/shared/` contracts (types, events, constants, service interfaces) and your `System` interface. You build the game loop, ECS-lite entity manager, asset loader, and wire `main.ts` with stub registrations for agents 2-10.

Without you, no other agent can communicate or plug into a running game.

---

## Your Mission

Build the orchestration layer: game lifecycle, fixed-timestep loop, typed event bus, entity manager, asset loading pipeline, dev overlay, and system registry. Export everything through `src/shared/` so all 9 other agents import the same contracts.

---

## File Checklist (Create ALL of These)

```
src/
  shared/
    index.ts
    types.ts
    events.ts
    constants.ts
    services.ts
    math.ts
    logger.ts
  core/
    index.ts
    createSystem.ts
    Game.ts
    GameLoop.ts
    SystemRegistry.ts
    EntityManager.ts
    AssetLoader.ts
    DevOverlay.ts
    StateManager.ts
    __tests__/
      GameLoop.test.ts
      EventBus.test.ts
  main.ts          (rewrite)
  style.css        (update)
index.html         (update — add canvas, loading screen)
```

---

## Detailed Implementation Spec

### 1. `src/shared/math.ts`
Utility math used by all agents. No Three.js dependency here.

```typescript
export function clamp(v: number, min: number, max: number): number;
export function lerp(a: number, b: number, t: number): number;
export function degToRad(d: number): number;
export function radToDeg(r: number): number;
export function vec3(x = 0, y = 0, z = 0): Vec3;
export function distance3(a: Vec3, b: Vec3): number;
export function normalize3(v: Vec3): Vec3;
export function quatFromEuler(x: number, y: number, z: number): Quat;
```

### 2. `src/shared/events.ts`
Typed event bus. **This is the most critical file for conflict-free parallel work.**

```typescript
export type EventMap = {
  'game:init': Record<string, never>;
  'game:ready': Record<string, never>;
  'game:tick': { delta: number; elapsed: number; fixedDelta: number };
  // ... ALL events from master plan section 4.3
};

export class EventBus {
  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void;
  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void;
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
  once<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void;
}
```

Implementation: `Map<string, Set<Function>>`. Synchronous dispatch. Handlers must not throw (wrap in try/catch, log via logger).

### 3. `src/shared/types.ts`
All shared interfaces from master plan section 4.2 plus:

```typescript
export interface AssetLoadProgress {
  loaded: number;
  total: number;
  currentFile: string;
  percent: number;
}

export interface BodyConfig {
  shape: 'box' | 'sphere' | 'capsule' | 'trimesh';
  dimensions: Vec3;
  mass: number;
  position: Vec3;
  collisionGroup: number;
  collisionMask: number;
}

export interface RaycastHit {
  bodyId: number;
  entityId: EntityId;
  point: Vec3;
  normal: Vec3;
  distance: number;
}
```

### 4. `src/shared/services.ts`
Service interface definitions (read-only contracts). See master plan section 4.5. Agent 1 defines interfaces only; other agents implement.

### 5. `src/shared/constants.ts`
All constants from master plan section 4.4.

### 6. `src/shared/logger.ts`
```typescript
export enum LogLevel { DEBUG, INFO, WARN, ERROR }
export const logger = {
  debug(tag: string, ...args: unknown[]): void;
  info(tag: string, ...args: unknown[]): void;
  warn(tag: string, ...args: unknown[]): void;
  error(tag: string, ...args: unknown[]): void;
};
```
In production build, DEBUG silenced. Prefix: `[GTX:tag]`.

### 7. `src/core/GameLoop.ts`
Dual-loop architecture:

```
requestAnimationFrame loop:
  ├── accumulate real delta time
  ├── while (accumulator >= fixedDelta):
  │     ├── fixedUpdate(fixedDelta)  → physics, gameplay logic
  │     └── accumulator -= fixedDelta
  ├── alpha = accumulator / fixedDelta  (interpolation factor)
  └── update(delta, alpha)  → render, camera, UI
```

- `fixedDelta = 1 / PHYSICS_TICK_RATE` (1/60 = 0.01667s)
- Clamp delta to `MAX_DELTA_TIME` (50ms)
- Track `elapsed` total time
- Emit `game:tick` on every variable update with `{ delta, elapsed, fixedDelta }`

### 8. `src/core/Game.ts`
Main orchestrator:

```typescript
export class Game {
  private ctx: GameContext;
  private loop: GameLoop;
  private state: GameState = GameState.LOADING;

  async init(): Promise<void> {
    // 1. Create canvas, append to #app
    // 2. Create EventBus, SystemRegistry, AssetLoader
    // 3. Build GameContext
    // 4. Register all systems (stubs for 2-10)
    // 5. await Promise.all(systems.map(s => s.init(ctx)))
    // 6. Emit game:ready
    // 7. Set state to PLAYING
    // 8. Start loop
  }

  pause(): void;   // state → PAUSED, emit game:pause
  resume(): void;  // state → PLAYING, emit game:resume
  destroy(): void; // dispose all systems, remove canvas
}
```

### 9. `src/core/SystemRegistry.ts`
```typescript
export class SystemRegistry implements SystemRegistry {
  private systems = new Map<SystemName, System>();
  private updateOrder: SystemName[] = [
    'physics', 'player', 'vehicles', 'ai', 'gameplay',  // fixed
    'world', 'player', 'vehicles', 'ai', 'gameplay',     // variable
    'audio', 'ui', 'renderer'                             // variable tail
  ];

  register(system: System): void;  // throws if duplicate name
  get<T extends System>(name: SystemName): T;
  getAll(): System[];
  getUpdateOrder(): SystemName[];
}
```

### 10. `src/core/EntityManager.ts`
ECS-lite:

```typescript
export class EntityManager {
  private nextId = 1;
  private components = new Map<string, Map<EntityId, unknown>>();
  private alive = new Set<EntityId>();

  createEntity(): EntityId;
  destroyEntity(id: EntityId): void;
  addComponent<T>(id: EntityId, type: string, data: T): void;
  getComponent<T>(id: EntityId, type: string): T | undefined;
  hasComponent(id: EntityId, type: string): boolean;
  query(type: string): EntityId[];  // all entities with component type
}
```

### 11. `src/core/AssetLoader.ts`
```typescript
export class AssetLoader {
  private cache = new Map<string, unknown>();
  private queue: Array<{ url: string; type: 'gltf' | 'texture' | 'audio' }> = [];

  async loadManifest(manifest: AssetManifest): Promise<void>;
  get<T>(url: string): T;
  has(url: string): boolean;
  onProgress(callback: (progress: AssetLoadProgress) => void): void;

  // Internal: uses fetch + GLTFLoader (from three/addons) for gltf
  // Uses THREE.TextureLoader for textures
  // Stores Howl instances for audio (lazy, Agent 8 uses)
}
```

### 12. `src/core/DevOverlay.ts`
HTML overlay (not Three.js):

```typescript
export class DevOverlay {
  show(): void;
  hide(): void;
  toggle(): void;  // F3 key
  update(stats: { fps: number; drawCalls: number; triangles: number; entities: number }): void;
}
```

Display top-left corner, monospace font, semi-transparent black background:
```
FPS: 60 | Draw: 234 | Tris: 1.2M | Entities: 45
```

### 13. `src/core/StateManager.ts`
```typescript
export class StateManager {
  private state: GameState = GameState.LOADING;
  getState(): GameState;
  setState(next: GameState): void;  // emits game:stateChange
}
```

### 14. `src/core/createSystem.ts`
```typescript
export function createCoreSystem(ctx: GameContext): System {
  return {
    name: 'core',
    async init() { /* setup DevOverlay, StateManager */ },
    fixedUpdate() { /* nothing */ },
    update(dt) { /* update DevOverlay stats */ },
    dispose() { /* cleanup */ },
  };
}
```

### 15. `src/main.ts` (Rewrite)
```typescript
import './style.css';
import { Game } from './core/Game';

// Stub imports — replaced during integration merges
// import { createRendererSystem } from './renderer';
// import { createWorldSystem } from './world';
// ... etc

async function bootstrap() {
  const game = new Game();
  await game.init();
}

bootstrap().catch(console.error);
```

### 16. `index.html` (Update)
```html
<div id="app">
  <div id="loading-screen">
    <h1>GTX</h1>
    <p>Loading Vice City...</p>
    <div id="loading-bar"><div id="loading-fill"></div></div>
  </div>
  <canvas id="game-canvas"></canvas>
</div>
```

### 17. `src/style.css` (Update)
- Full viewport canvas
- Loading screen: Vice City pink gradient background, centered text
- Loading bar: teal fill on dark track
- Hide loading screen when `game:ready` fires (add class `hidden`)
- Dev overlay styles

---

## Stub System Template (For Agents 2-10)

In `main.ts` during Wave 1, register no-op stubs:

```typescript
function createStubSystem(name: SystemName): System {
  return {
    name,
    async init() { logger.info(name, 'stub initialized'); },
    fixedUpdate() {},
    update() {},
    dispose() {},
  };
}

// Until Agent 2 merges:
registry.register(createStubSystem('renderer'));
registry.register(createStubSystem('world'));
// ... etc for all 9
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `EventBus` | All agents |
| `System` interface | All agents |
| `GameContext` | All agents |
| `EntityManager` | 5, 6, 7, 10 |
| `AssetLoader` | 2, 3, 5, 6, 7, 8 |
| `SystemRegistry` | main.ts |
| Service interfaces in `shared/services.ts` | All agents implement/read |

| You Consume | From |
|-------------|------|
| Nothing in Wave 1 | — |

---

## Testing (Your Responsibility)

### Unit Tests
- `GameLoop.test.ts`: verify fixed timestep runs exactly N times for given delta
- `EventBus.test.ts`: on/off/emit/once, typed payloads

### Manual Test
1. `npm run dev` → loading screen appears then hides
2. Canvas fills viewport, dark background
3. F3 shows dev overlay with FPS counting
4. Console shows `[GTX:core] stub initialized` for each stub system
5. No TypeScript errors: `npm run build`

---

## Acceptance Criteria (Must All Pass)

- [ ] `src/shared/` exports all types, events, constants, services, math, logger
- [ ] Game loop runs at ~60fps with fixed 60Hz physics tick
- [ ] Event bus fires `game:init`, `game:ready`, `game:tick`
- [ ] SystemRegistry registers and retrieves systems by name
- [ ] EntityManager creates/destroys entities with components
- [ ] AssetLoader loads and caches files with progress callback
- [ ] DevOverlay toggles on F3, shows FPS
- [ ] Loading screen shows then hides on game:ready
- [ ] `npm run build` passes strict TypeScript
- [ ] No files created outside owned paths

---

## DO NOT

- Implement rendering, physics, world, player, or any gameplay logic
- Import from `src/renderer/`, `src/world/`, etc.
- Add npm dependencies without master plan approval
- Edit files outside your owned paths
