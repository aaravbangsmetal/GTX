# Agent 4: Physics and Collision System

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 4 |
| Branch | `agent-04-physics` |
| Owns | `src/physics/`, `public/assets/physics/` |
| Merge order | Wave 1 (parallel with 2, 3 after Agent 1) |
| Wave | 1 |

---

## Central Context

GTX is a browser GTA Vice City game. Agent 1 provides contracts. Agent 3 builds the city and exports collision mesh data per chunk. **You own all physics** — the cannon-es world, collision groups, raycasts, body management, and mesh-to-body sync.

Every dynamic entity (player, vehicles, NPCs, projectiles) gets a physics body through your `IPhysicsService`.

---

## Your Mission

Build a stable cannon-es physics world with fixed 60Hz stepping, collision groups, raycasting, trimesh import from world chunks, and body-to-mesh synchronization. Implement `IPhysicsService`.

---

## File Checklist

```
src/physics/
  index.ts
  createSystem.ts
  types.ts
  PhysicsSystem.ts
  PhysicsWorld.ts
  BodyFactory.ts
  CollisionGroups.ts
  Raycaster.ts
  PhysicsMaterial.ts
  TrimeshBuilder.ts
  ConstraintManager.ts
  BodyMeshSync.ts
  __mocks__/
    MockWorldService.ts
public/assets/physics/
  (empty — no assets needed)
```

---

## Detailed Implementation Spec

### 1. `src/physics/types.ts`

```typescript
export interface PhysicsBodyHandle {
  bodyId: number;
  entityId: EntityId;
  type: 'static' | 'dynamic' | 'kinematic';
  collisionGroup: CollisionGroup;
}

export interface PhysicsConfig {
  gravity: Vec3;
  solverIterations: number;
  broadphase: 'sap' | 'naive';
  allowSleep: boolean;
}

export interface RaycastOptions {
  origin: Vec3;
  direction: Vec3;
  maxDistance: number;
  collisionMask?: number;
  skipBodyId?: number;
}

export interface ContactEvent {
  bodyA: number;
  bodyB: number;
  entityA: EntityId;
  entityB: EntityId;
  point: Vec3;
  normal: Vec3;
  impulse: number;
}
```

### 2. `src/physics/CollisionGroups.ts`

```typescript
export enum CollisionGroup {
  STATIC    = 1 << 0,  // 1
  PLAYER    = 1 << 1,  // 2
  VEHICLE   = 1 << 2,  // 4
  NPC       = 1 << 3,  // 8
  PROJECTILE= 1 << 4,  // 16
  TRIGGER   = 1 << 5,  // 32
}

export const COLLISION_MASKS: Record<string, number> = {
  STATIC:     CollisionGroup.PLAYER | CollisionGroup.VEHICLE | CollisionGroup.NPC | CollisionGroup.PROJECTILE,
  PLAYER:     CollisionGroup.STATIC | CollisionGroup.VEHICLE | CollisionGroup.NPC | CollisionGroup.TRIGGER,
  VEHICLE:    CollisionGroup.STATIC | CollisionGroup.PLAYER | CollisionGroup.VEHICLE | CollisionGroup.NPC,
  NPC:        CollisionGroup.STATIC | CollisionGroup.PLAYER | CollisionGroup.VEHICLE | CollisionGroup.PROJECTILE,
  PROJECTILE: CollisionGroup.STATIC | CollisionGroup.NPC | CollisionGroup.PLAYER,
  TRIGGER:    CollisionGroup.PLAYER,
};
```

### 3. `src/physics/PhysicsMaterial.ts`

```typescript
export interface MaterialPreset {
  friction: number;
  restitution: number;
}

export const PHYSICS_MATERIALS: Record<string, MaterialPreset> = {
  'default':       { friction: 0.5,  restitution: 0.1 },
  'tire-road':     { friction: 1.2,  restitution: 0.05 },
  'tire-grass':    { friction: 0.6,  restitution: 0.1 },
  'foot-ground':   { friction: 0.8,  restitution: 0.0 },
  'foot-sidewalk': { friction: 0.9,  restitution: 0.0 },
  'vehicle-body':  { friction: 0.4,  restitution: 0.3 },
  'metal':         { friction: 0.3,  restitution: 0.5 },
  'ice':           { friction: 0.05, restitution: 0.1 },
};
```

### 4. `src/physics/BodyFactory.ts`

```typescript
import * as CANNON from 'cannon-es';

export class BodyFactory {
  constructor(private world: CANNON.World);

  createBox(config: {
    dimensions: Vec3;
    mass: number;
    position: Vec3;
    rotation?: Quat;
    group: CollisionGroup;
    mask: number;
    material?: string;
  }): CANNON.Body;

  createSphere(config: { radius: number; mass: number; position: Vec3; group: CollisionGroup; mask: number }): CANNON.Body;

  createCapsule(config: {
    radius: number;
    height: number;
    mass: number;
    position: Vec3;
    group: CollisionGroup;
    mask: number;
  }): CANNON.Body;
  // Capsule = cylinder + 2 hemispheres (compound shape)

  createTrimesh(config: {
    vertices: Float32Array;
    indices: Uint32Array;
    position: Vec3;
    group: CollisionGroup;
    mask: number;
  }): CANNON.Body;
  // Uses CANNON.Trimesh, mass=0 (static)

  createCylinder(config: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    mass: number;
    position: Vec3;
    group: CollisionGroup;
    mask: number;
  }): CANNON.Body;

  removeBody(body: CANNON.Body): void;
}
```

### 5. `src/physics/TrimeshBuilder.ts`

```typescript
export class TrimeshBuilder {
  private chunkBodies = new Map<string, CANNON.Body>();

  buildFromChunkData(data: CollisionChunkData): CANNON.Body;
  removeChunk(chunkId: string): void;

  // Listen for world:chunkLoaded → build trimesh, add to world
  // Listen for world:chunkUnloaded → remove trimesh
  // Simplify mesh: reduce vertices if > 10000 per chunk (use decimation)
  // Position at chunk origin offset
}
```

### 6. `src/physics/Raycaster.ts`

```typescript
export class PhysicsRaycaster {
  constructor(private world: CANNON.World, private bodyEntityMap: Map<number, EntityId>);

  cast(options: RaycastOptions): RaycastHit | null;
  castAll(options: RaycastOptions): RaycastHit[];

  // Uses CANNON.World.raycastClosest / raycastAll
  // Returns entity ID via bodyEntityMap
  // Used by:
  //   Agent 5: ground check (downward ray, 2m)
  //   Agent 5: camera collision (from player to camera pos)
  //   Agent 6: wheel raycasts (downward, suspension)
  //   Agent 10: shooting hit detection
}
```

### 7. `src/physics/ConstraintManager.ts`

```typescript
export class ConstraintManager {
  createLock(bodyA: CANNON.Body, bodyB: CANNON.Body): CANNON.PointToPointConstraint;
  removeConstraint(constraint: CANNON.Constraint): void;

  // Used by Agent 6: lock player body to vehicle seat while driving
  // Used by Agent 6: hinge for car doors (future)
}
```

### 8. `src/physics/BodyMeshSync.ts`

```typescript
export class BodyMeshSync {
  private pairs = new Map<number, { mesh: THREE.Object3D; offset?: Vec3 }>();

  bind(bodyId: number, mesh: THREE.Object3D, offset?: Vec3): void;
  unbind(bodyId: number): void;
  sync(): void;  // called after physics step: copy body position/quaternion to mesh

  // Position: mesh.position.copy(body.position)
  // Rotation: mesh.quaternion.copy(body.quaternion)
  // Offset: for models where origin != physics center
}
```

### 9. `src/physics/PhysicsWorld.ts`

```typescript
import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  readonly world: CANNON.World;
  private bodyFactory: BodyFactory;
  private bodyEntityMap = new Map<number, EntityId>();
  private entityBodyMap = new Map<EntityId, number>();
  private nextBodyId = 1;

  constructor(config: PhysicsConfig) {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 10;
    this.world.allowSleep = true;
    this.bodyFactory = new BodyFactory(this.world);
  }

  step(dt: number): void;  // world.step(1/60, dt, 3)
  addBody(body: CANNON.Body, entityId: EntityId): number;
  removeBodyByEntity(entityId: EntityId): void;
  getBody(bodyId: number): CANNON.Body;
  getBodyByEntity(entityId: EntityId): CANNON.Body | undefined;

  // Contact listener:
  // world.addEventListener('postStep', () => check contacts)
  // Emit physics:collision for significant impulses (> 5)
}
```

### 10. `src/physics/PhysicsSystem.ts`

```typescript
export class PhysicsSystem implements System, IPhysicsService {
  name = 'physics' as const;

  private physicsWorld: PhysicsWorld;
  private raycaster: PhysicsRaycaster;
  private trimeshBuilder: TrimeshBuilder;
  private bodyMeshSync: BodyMeshSync;
  private constraints: ConstraintManager;

  async init(ctx: GameContext): Promise<void> {
    this.physicsWorld = new PhysicsWorld({ gravity: vec3(0, -9.82, 0), solverIterations: 10, broadphase: 'sap', allowSleep: true });
    this.raycaster = new PhysicsRaycaster(this.physicsWorld.world, ...);
    this.trimeshBuilder = new TrimeshBuilder(this.physicsWorld);
    this.bodyMeshSync = new BodyMeshSync();
    this.constraints = new ConstraintManager(this.physicsWorld.world);

    // Listen for world:chunkLoaded → trimeshBuilder.buildFromChunkData
    // Listen for world:chunkUnloaded → trimeshBuilder.removeChunk

    // Create ground plane as fallback (Y=0) until chunks load
    this.createGroundPlane();
  }

  fixedUpdate(dt: number): void {
    this.physicsWorld.step(dt);
    this.bodyMeshSync.sync();
    this.checkCollisions();
  }

  // IPhysicsService implementation
  createBody(config: BodyConfig): number;
  removeBody(bodyId: number): void;
  raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null;
  getBodyTransform(bodyId: number): Transform;
  setBodyTransform(bodyId: number, transform: Transform): void;
}
```

---

## Ground Plane (Fallback)

Until Agent 3 chunks load, provide an infinite ground:

```typescript
private createGroundPlane(): void {
  const ground = this.bodyFactory.createBox({
    dimensions: vec3(2000, 0.1, 2000),
    mass: 0,
    position: vec3(0, -0.05, 0),
    group: CollisionGroup.STATIC,
    mask: COLLISION_MASKS.STATIC,
    material: 'foot-ground',
  });
}
```

---

## Test Harness (Standalone)

Build a test that works without other agents:

1. Ground plane at Y=0
2. Spawn 10 boxes at Y=10, they fall and stack
3. Raycast downward from (0, 5, 0) hits ground at Y=0
4. Create capsule (player proxy), apply velocity, walks on ground
5. 100 dynamic bodies stable at 60Hz for 10 seconds
6. Collision groups: player capsule does NOT pass through vehicle box

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `IPhysicsService` (createBody, raycast, transforms) | 5, 6, 7, 10 |
| `BodyMeshSync.bind()` | 5, 6, 7 |
| `ConstraintManager` | 6 |
| `physics:collision` events | 6, 8, 10 |
| `physics:bodyCreated` events | 5, 6, 7 |
| Static trimesh collision | all dynamic entities |

| You Consume | From |
|-------------|------|
| `CollisionChunkData` via `world:chunkLoaded` | Agent 3 |
| `IWorldService.getCollisionData()` | Agent 3 |
| `GameContext`, `System`, `EventBus` | Agent 1 |

---

## Acceptance Criteria

- [ ] Ground plane prevents objects falling through Y=0
- [ ] Trimesh collision loads/unloads with world chunks
- [ ] Collision groups work: player/vehicle/NPC/static/projectile masks correct
- [ ] Raycast returns accurate hit point and normal
- [ ] 100 dynamic bodies stable at 60Hz
- [ ] BodyMeshSync copies physics → mesh each frame
- [ ] Contact events emit for significant collisions
- [ ] Capsule body works for character controller
- [ ] All 8 physics material presets defined
- [ ] `npm run build` passes

---

## DO NOT

- Implement player movement or vehicle driving (Agents 5, 6)
- Build world geometry (Agent 3)
- Handle rendering (Agent 2)
- Edit any folder outside `src/physics/`
