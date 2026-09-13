# Agent 7: NPC AI and Traffic System

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 7 |
| Branch | `agent-07-ai` |
| Owns | `src/ai/`, `public/assets/ai/` |
| Merge order | Wave 2 |
| Wave | 2 |

---

## Central Context

GTX is a browser GTA Vice City game. Wave 1 merged. Agent 3 provides road network and sidewalks. Agent 4 provides physics. Agent 6 provides Vehicle class and traffic spawn points. Agent 10 will trigger wanted levels that spawn police. **You make the city feel alive** — pedestrians, traffic, reactions, and police pursuit.

---

## Your Mission

Build pedestrian AI, traffic system, pathfinding, behavior trees, police chase, and spawn management. Max 20 pedestrians + 15 traffic vehicles active at once.

---

## File Checklist

```
src/ai/
  index.ts
  createSystem.ts
  types.ts
  AISystem.ts
  NPC.ts
  PedestrianAI.ts
  TrafficManager.ts
  TrafficAI.ts
  Pathfinder.ts
  BehaviorTree.ts
  PoliceAI.ts
  SpawnManager.ts
  ReactionSystem.ts
  NPCModel.ts
  NavGrid.ts
  __mocks__/
    MockWorldService.ts
    MockVehicleService.ts
public/assets/ai/
  models/
    pedestrian-male.glb
    pedestrian-female.glb
    police-officer.glb
```

---

## Detailed Implementation Spec

### 1. `src/ai/types.ts`

```typescript
export enum NPCType {
  PEDESTRIAN, POLICE_OFFICER, POLICE_DRIVER, HOSTILE, VENDOR
}

export enum NPCBehaviorState {
  IDLE, WALKING, FLEEING, AGGRESSIVE, DEAD, IN_VEHICLE
}

export interface NPCConfig {
  type: NPCType;
  walkSpeed: number;     // 1.5 m/s
  runSpeed: number;      // 5 m/s
  health: number;
  aggression: number;    // 0-1
  fleeDistance: number;  // meters, flee if threat within this
}

export interface TrafficVehicleConfig {
  type: VehicleTypeId;
  maxSpeed: number;      // km/h, traffic drives slower than max
  followDistance: number; // meters behind vehicle ahead
  laneOffset: number;
}

export interface PathNode {
  position: Vec3;
  connections: number[];  // indices of connected nodes
}
```

### 2. `src/ai/BehaviorTree.ts`

```typescript
// Lightweight behavior tree (no external lib)

export type BTNode = BTAction | BTCondition | BTSelector | BTSequence;

export interface BTAction { type: 'action'; fn: (ctx: BTContext) => BTStatus; }
export interface BTCondition { type: 'condition'; fn: (ctx: BTContext) => boolean; }
export interface BTSelector { type: 'selector'; children: BTNode[]; }  // OR: first success
export interface BTSequence { type: 'sequence'; children: BTNode[]; }  // AND: all must succeed

export type BTStatus = 'success' | 'failure' | 'running';

export interface BTContext {
  npc: NPC;
  playerPos: Vec3;
  playerDist: number;
  wantedLevel: number;
  deltaTime: number;
}

export function tickTree(node: BTNode, ctx: BTContext): BTStatus;
```

### 3. `src/ai/Pathfinder.ts`

```typescript
export class RoadPathfinder {
  constructor(private roadNetwork: RoadNetworkData);

  findPath(from: Vec3, to: Vec3): Vec3[];
  // A* on road graph:
  // 1. Find nearest road segment for from/to
  // 2. A* through intersection graph
  // 3. Return waypoints along road splines

  getNearestPointOnRoad(pos: Vec3): { point: Vec3; segmentId: string; t: number };
  getLanePosition(segmentId: string, t: number, lane: number, direction: 1 | -1): Vec3;
}

export class PedestrianPathfinder {
  constructor(private navGrid: NavGrid);

  findPath(from: Vec3, to: Vec3): Vec3[];
  // A* on 2m grid nav mesh (walkable = sidewalk + plaza, not roads)
  getRandomWalkablePoint(center: Vec3, radius: number): Vec3;
}
```

### 4. `src/ai/NavGrid.ts`

```typescript
export class NavGrid {
  private grid: boolean[][];  // true = walkable
  private cellSize = 2;       // meters

  constructor(mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number });
  markWalkable(x: number, z: number, width: number, depth: number): void;
  markUnwalkable(x: number, z: number, width: number, depth: number): void;
  isWalkable(x: number, z: number): boolean;
  worldToGrid(pos: Vec3): { gx: number; gz: number };
  gridToWorld(gx: number, gz: number): Vec3;
  // Build from Agent 3 sidewalk data on init
}
```

### 5. `src/ai/NPC.ts`

```typescript
export class NPC {
  readonly entityId: EntityId;
  readonly config: NPCConfig;
  readonly model: NPCModel;

  state: NPCBehaviorState = NPCBehaviorState.IDLE;
  health: number;
  position: Vec3;
  targetPosition: Vec3 | null = null;
  path: Vec3[] = [];
  pathIndex = 0;
  bodyId: number;

  private physics: IPhysicsService;
  private behaviorTree: BTNode;

  constructor(entityId: EntityId, config: NPCConfig, position: Vec3, ...);

  update(dt: number, ctx: BTContext): void;
  // 1. Tick behavior tree
  // 2. Move along path (if WALKING/FLEEING)
  // 3. Apply velocity to physics body
  // 4. Rotate model to face movement direction

  takeDamage(amount: number): void;
  die(): void;
  // state → DEAD, emit ai:npcDeath, remove after 5s

  fleeFrom(threatPos: Vec3): void;
  // Set target away from threat, state → FLEEING, speed = runSpeed
}
```

### 6. `src/ai/PedestrianAI.ts`

```typescript
export function createPedestrianBehaviorTree(): BTNode {
  return {
    type: 'selector',
    children: [
      // 1. If dead → do nothing
      { type: 'condition', fn: (ctx) => ctx.npc.state === NPCBehaviorState.DEAD },
      // 2. If threat nearby → flee
      {
        type: 'sequence',
        children: [
          { type: 'condition', fn: (ctx) => ctx.playerDist < ctx.npc.config.fleeDistance },
          { type: 'action', fn: (ctx) => { ctx.npc.fleeFrom(ctx.playerPos); return 'success'; }},
        ],
      },
      // 3. If has path → walk
      {
        type: 'sequence',
        children: [
          { type: 'condition', fn: (ctx) => ctx.npc.path.length > 0 },
          { type: 'action', fn: walkAlongPath },
        ],
      },
      // 4. Default → pick random destination and walk
      { type: 'action', fn: pickRandomDestination },
    ],
  };
}

function pickRandomDestination(ctx: BTContext): BTStatus {
  const dest = ctx.pathfinder.getRandomWalkablePoint(ctx.npc.position, 50);
  ctx.npc.path = ctx.pedPathfinder.findPath(ctx.npc.position, dest);
  ctx.npc.state = NPCBehaviorState.WALKING;
  return 'success';
}
```

### 7. `src/ai/TrafficManager.ts`

```typescript
export class TrafficManager {
  private activeTraffic = new Map<EntityId, TrafficEntry>();
  private maxVehicles = MAX_TRAFFIC_VEHICLES;  // 15

  constructor(
    private vehicleService: IVehicleService,
    private roadPathfinder: RoadPathfinder,
    private spawnPoints: typeof TRAFFIC_SPAWN_POINTS,
  );

  update(playerPos: Vec3, dt: number): void;
  // 1. Despawn traffic > 250m from player
  // 2. If activeTraffic.size < max:
  //    a. Pick spawn point 150-200m ahead of player on a road
  //    b. Spawn vehicle via vehicleService.spawnVehicle (AI_CONTROLLED)
  //    c. Assign TrafficAI controller
  // 3. Update all active TrafficAI

  despawnAll(): void;
  // For wanted level cleanup
}
```

### 8. `src/ai/TrafficAI.ts`

```typescript
export class TrafficAI {
  private path: Vec3[] = [];
  private pathIndex = 0;
  private currentSpeed = 0;
  private targetSpeed = 40;  // km/h default traffic speed
  private vehicle: Vehicle;  // from Agent 6

  constructor(vehicle: Vehicle, roadPathfinder: RoadPathfinder, destination: Vec3);

  update(dt: number): void;
  // 1. Follow path waypoints (advance when within 3m of current)
  // 2. Steer toward next waypoint
  // 3. Accelerate/brake to targetSpeed
  // 4. At intersections with traffic light:
  //    - Stop if light is red (global timer: 15s green, 5s yellow, 5s red per intersection)
  // 5. Avoidance: raycast 10m ahead, brake if vehicle detected
  // 6. If path complete: pick new random destination on road network

  private checkTrafficLight(intersection: Intersection): boolean;
  // Returns true if should stop
}
```

### 9. `src/ai/PoliceAI.ts`

```typescript
export class PoliceAI {
  private activePolice = new Map<EntityId, PoliceUnit>();

  constructor(private vehicleService: IVehicleService, private roadPathfinder: RoadPathfinder);

  onWantedLevelChange(level: number, playerPos: Vec3): void;
  // Level 1: radio chatter only (event, no spawn)
  // Level 2: spawn 1 police car 100m away, chase player
  // Level 3: spawn 2 police cars + roadblock ahead on nearest road
  // Level 4: spawn 2 police cars + 1 SWAT truck
  // Level 5: max response (3 cars + roadblocks)
  // Level 0: despawn all police

  update(playerPos: Vec3, dt: number): void;
  // Each police unit:
  // 1. Pathfind toward player position (updated every 2s)
  // 2. Drive at 90% max speed (aggressive)
  // 3. Try to ram player vehicle if close
  // 4. If player on foot: drive to player, stop, officer exits (future)

  private spawnPoliceUnit(position: Vec3): EntityId;
  // vehicleService.spawnVehicle('police', position)
  // Assign chase AI
}
```

### 10. `src/ai/SpawnManager.ts`

```typescript
export class SpawnManager {
  private activeNPCs = new Map<EntityId, NPC>();
  private maxPeds = MAX_PEDESTRIANS;  // 20

  update(playerPos: Vec3, district: DistrictId, dt: number): void;
  // 1. Despawn NPCs > 80m from player
  // 2. Spawn new NPCs if below max:
  //    a. Density from district config (Downtown=high, Starfish=low)
  //    b. Spawn on random sidewalk point within 60m
  //    c. Random pedestrian model (male/female)
  // 3. Update all NPC behavior trees

  spawnNPC(type: NPCType, position: Vec3): EntityId;
  despawnNPC(entityId: EntityId): void;
}
```

### 11. `src/ai/ReactionSystem.ts`

```typescript
export class ReactionSystem {
  constructor(private spawnManager: SpawnManager, private events: EventBus);

  init(): void;
  // Listen for:
  // combat:shoot → NPCs within 30m flee
  // physics:collision (high impulse) → nearby NPCs flee
  // vehicle:horn → NPCs within 10m scatter
  // player:move (speed > 10, near NPC) → NPCs flee from car
  // wanted:levelChange → police AI responds
}
```

### 12. `src/ai/NPCModel.ts`

```typescript
export class NPCModel {
  private group: THREE.Group;

  async load(type: NPCType, assets: AssetLoader): Promise<void>;
  // Placeholder: simple humanoid (smaller than player)
  // Random shirt color
  // Police: blue uniform

  getMesh(): THREE.Group;
  setAnimation(state: 'idle' | 'walk' | 'run'): void;
  // Simple: bob up/down for walk, faster for run
}
```

### 13. `src/ai/AISystem.ts`

```typescript
export class AISystem implements System {
  name = 'ai' as const;

  private spawnManager: SpawnManager;
  private trafficManager: TrafficManager;
  private policeAI: PoliceAI;
  private reactionSystem: ReactionSystem;
  private roadPathfinder: RoadPathfinder;
  private pedPathfinder: PedestrianPathfinder;

  async init(ctx: GameContext): Promise<void> {
    const world = ctx.getSystem('world');
    const vehicles = ctx.getSystem('vehicles');

    this.roadPathfinder = new RoadPathfinder(world.getRoadNetwork());
    this.pedPathfinder = new PedestrianPathfinder(new NavGrid(...));
    this.spawnManager = new SpawnManager(...);
    this.trafficManager = new TrafficManager(vehicles, this.roadPathfinder, TRAFFIC_SPAWN_POINTS);
    this.policeAI = new PoliceAI(vehicles, this.roadPathfinder);
    this.reactionSystem = new ReactionSystem(this.spawnManager, ctx.events);
    this.reactionSystem.init();
  }

  fixedUpdate(dt: number): void {
    const playerPos = ctx.getSystem('player').getPosition();
    const district = ctx.getSystem('world').getDistrictAt(playerPos);
    const wantedLevel = ctx.getSystem('player').getState().wantedLevel;

    this.spawnManager.update(playerPos, district, dt);
    this.trafficManager.update(playerPos, dt);
    this.policeAI.update(playerPos, dt);
  }

  update(dt: number): void {
    // Visual sync handled by physics BodyMeshSync
  }
}
```

---

## Traffic Light System

Global intersection timer (synchronized):

```typescript
export class TrafficLightManager {
  private cycleTime = 25;  // seconds per full cycle
  private phase: 'green' | 'yellow' | 'red' = 'green';

  update(dt: number): void;
  shouldStop(intersectionId: string): boolean;
  // NS roads: green 0-15s, yellow 15-18s, red 18-25s
  // EW roads: opposite phase
}
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| Living city (peds + traffic) | gameplay feel |
| `ai:npcSpawn/npcDeath` events | 8, 10 |
| Police chase behavior | 10 (wanted system) |
| NPC damage/death | 10 (combat) |

| You Consume | From |
|-------------|------|
| `RoadNetworkData`, sidewalks | Agent 3 |
| `IPhysicsService` | Agent 4 |
| `IVehicleService`, `Vehicle`, `TRAFFIC_SPAWN_POINTS` | Agent 6 |
| `player:move`, position | Agent 5 |
| `wanted:levelChange` | Agent 10 |
| `combat:shoot`, `physics:collision` | Agent 10, 4 |

---

## Acceptance Criteria

- [ ] Pedestrians spawn on sidewalks near player (up to 20)
- [ ] Pedestrians walk random paths, flee from cars/gunshots
- [ ] Traffic drives on roads (up to 15 vehicles)
- [ ] Traffic stops at red lights, resumes on green
- [ ] Traffic avoids vehicles ahead (braking)
- [ ] Police car spawns and chases at wanted level 2+
- [ ] NPCs despawn beyond 80m, traffic beyond 250m
- [ ] Performance: 20 peds + 15 traffic at 60fps
- [ ] `npm run build` passes

---

## DO NOT

- Create vehicle physics (Agent 6) — use their Vehicle class
- Build road network (Agent 3)
- Implement wanted level logic (Agent 10) — only react to events
- Edit folders outside `src/ai/`
