# Agent 6: Vehicle System and Driving

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 6 |
| Branch | `agent-06-vehicles` |
| Owns | `src/vehicles/`, `public/assets/vehicles/` |
| Merge order | Wave 2 |
| Wave | 2 |

---

## Central Context

GTX is a browser GTA Vice City game. Wave 1 merged. Agent 5 provides player with enter/exit events. Agent 4 provides physics. **You own all vehicles** — spawning, arcade driving physics, enter/exit, damage, camera switching, and `IVehicleService`.

Vice City vehicle lineup: sedans, sports cars, motorcycles, trucks. Arcade-fun handling, not simulation.

---

## Your Mission

Build complete vehicle system: raycast wheel physics, 4 vehicle types, enter/exit with player, driving camera, damage states, and traffic spawn points for Agent 7.

---

## File Checklist

```
src/vehicles/
  index.ts
  createSystem.ts
  types.ts
  VehicleSystem.ts
  Vehicle.ts
  VehiclePhysics.ts
  VehicleTypes.ts
  VehicleSpawner.ts
  EnterExit.ts
  VehicleDamage.ts
  VehicleCamera.ts
  VehicleModel.ts
  WheelRaycaster.ts
  TrafficSpawnPoints.ts
  __mocks__/
    MockPhysicsService.ts
public/assets/vehicles/
  models/
    sedan.glb
    sportscar.glb
    motorcycle.glb
    truck.glb
  sounds/
    (handled by Agent 8 — only reference IDs here)
```

---

## Detailed Implementation Spec

### 1. `src/vehicles/types.ts`

```typescript
export enum VehicleState {
  PARKED, DRIVEN, AI_CONTROLLED, DESTROYED, SUBMERGED
}

export interface VehicleSnapshot {
  entityId: EntityId;
  type: VehicleTypeId;
  state: VehicleState;
  position: Vec3;
  speed: number;        // m/s
  speedKmh: number;
  health: number;       // 0-100
  driverId: EntityId | null;
  heading: number;      // radians
}

export type VehicleTypeId = 'sedan' | 'sportscar' | 'motorcycle' | 'truck' | 'police';

export interface VehicleTypeConfig {
  id: VehicleTypeId;
  name: string;           // "Cheetah", "Infernus", etc.
  mass: number;           // kg
  maxSpeed: number;       // m/s
  acceleration: number;   // m/s²
  brakeForce: number;
  steerSpeed: number;     // rad/s max
  grip: number;           // 0-1 friction multiplier
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionRestLength: number;
  engineForce: number;
  dimensions: Vec3;       // L×H×W
  wheelRadius: number;
  wheelCount: 2 | 4;
  modelPath: string;
  seatOffset: Vec3;       // driver seat relative to center
}
```

### 2. `src/vehicles/VehicleTypes.ts`

```typescript
export const VEHICLE_TYPES: Record<VehicleTypeId, VehicleTypeConfig> = {
  sedan: {
    id: 'sedan', name: 'Cheetah', mass: 1200,
    maxSpeed: 33.3,  // 120 km/h
    acceleration: 8, brakeForce: 15, steerSpeed: 2.5, grip: 0.85,
    suspensionStiffness: 30, suspensionDamping: 4.5, suspensionRestLength: 0.3,
    engineForce: 3000, dimensions: vec3(4.5, 1.4, 1.8), wheelRadius: 0.35,
    wheelCount: 4, modelPath: '/assets/vehicles/models/sedan.glb',
    seatOffset: vec3(-0.4, 0.5, 0.3),
  },
  sportscar: {
    id: 'sportscar', name: 'Infernus', mass: 900,
    maxSpeed: 50,  // 180 km/h
    acceleration: 12, brakeForce: 20, steerSpeed: 3.0, grip: 0.95,
    engineForce: 5000, ...
  },
  motorcycle: {
    id: 'motorcycle', name: 'PCJ-600', mass: 200,
    maxSpeed: 41.7,  // 150 km/h
    wheelCount: 2, ...
  },
  truck: {
    id: 'truck', name: 'Flatbed', mass: 3000,
    maxSpeed: 25,  // 90 km/h
    acceleration: 4, grip: 0.7, ...
  },
  police: {
    id: 'police', name: 'Police Cruiser', mass: 1300,
    maxSpeed: 38.9,  // 140 km/h — faster than sedan
    // Based on sedan with police livery
  },
};
```

### 3. `src/vehicles/WheelRaycaster.ts`

```typescript
export interface WheelInfo {
  position: Vec3;       // local offset from chassis
  radius: number;
  isFront: boolean;
  suspensionLength: number;
  isGrounded: boolean;
  groundNormal: Vec3;
}

export class WheelRaycaster {
  constructor(private physics: IPhysicsService);

  raycastWheels(chassisPos: Vec3, chassisQuat: Quat, wheels: WheelInfo[]): void;
  // For each wheel:
  //   worldPos = chassisPos + rotate(chassisQuat, wheel.position)
  //   raycast from worldPos downward (chassis up vector), maxDist = restLength + radius
  //   Update: suspensionLength, isGrounded, groundNormal

  applySuspensionForce(wheel: WheelInfo, chassisBody: CANNON.Body, config: VehicleTypeConfig): void;
  // springForce = stiffness * (restLength - currentLength)
  // damperForce = damping * verticalVelocity
  // Apply at wheel position

  applyEngineForce(wheel: WheelInfo, force: number, chassisBody: CANNON.Body): void;
  // Only rear wheels (or rear wheel for motorcycle)
  // Force along wheel forward direction

  applySteering(wheel: WheelInfo, angle: number): void;
  // Front wheels only: rotate wheel forward direction by angle
}
```

### 4. `src/vehicles/VehiclePhysics.ts`

```typescript
export class VehiclePhysics {
  private bodyId: number;
  private wheels: WheelInfo[];
  private wheelRaycaster: WheelRaycaster;
  private currentSteer = 0;
  private engineForce = 0;
  private braking = false;

  constructor(private physics: IPhysicsService, private config: VehicleTypeConfig);

  init(position: Vec3, rotation: Quat): void;
  // Create box chassis body: mass from config, dimensions from config
  // group: VEHICLE, mask: COLLISION_MASKS.VEHICLE
  // Setup wheels from config (4 or 2 positions)

  update(input: VehicleInput, dt: number): void;
  // input: { throttle: -1 to 1, steer: -1 to 1, brake: boolean, handbrake: boolean }
  //
  // 1. Raycast all wheels
  // 2. Apply suspension forces
  // 3. Engine: throttle * engineForce on drive wheels
  // 4. Steering: lerp currentSteer toward input.steer * steerSpeed * dt
  // 5. Apply steering to front wheels
  // 6. Braking: brakeForce on all wheels when brake input
  // 7. Handbrake: reduce rear grip to 0.3 (drift)
  // 8. Clamp speed to maxSpeed
  // 9. Auto-brake: if no throttle and speed < 1, apply light brake
  // 10. Emit vehicle:enginePitch and vehicle:speedChange

  getSpeed(): number;
  getSpeedKmh(): number;
  getPosition(): Vec3;
  getRotation(): Quat;
  getHeading(): number;
  applyImpulse(impulse: Vec3, point: Vec3): void;
  // For collisions
}
```

### 5. `src/vehicles/Vehicle.ts`

```typescript
export class Vehicle {
  readonly entityId: EntityId;
  readonly config: VehicleTypeConfig;
  readonly physics: VehiclePhysics;
  readonly model: VehicleModel;
  readonly damage: VehicleDamage;

  state: VehicleState = VehicleState.PARKED;
  driverId: EntityId | null = null;
  health = 100;

  constructor(entityId: EntityId, config: VehicleTypeConfig, ...);

  getSnapshot(): VehicleSnapshot;
  setDriver(playerId: EntityId | null): void;
  destroy(): void;
  // state → DESTROYED, emit vehicle:destroy
}
```

### 6. `src/vehicles/VehicleModel.ts`

```typescript
export class VehicleModel {
  private group: THREE.Group;

  async load(config: VehicleTypeConfig, assets: AssetLoader): Promise<void>;
  // Load gltf or create placeholder:
  //   Sedan: box 4.5×1.4×1.8, 4 wheel cylinders, windshield (glass material)
  //   Colors: random from vice city palette
  //   Police: black/white livery

  getMesh(): THREE.Group;
  updateWheels(wheels: WheelInfo[]): void;
  // Rotate wheel meshes based on speed
  // Steer front wheels visually

  setDamageLevel(level: 0 | 1 | 2 | 3): void;
  // 0: pristine, 1: dents, 2: smoke particle, 3: fire + broken
}
```

### 7. `src/vehicles/EnterExit.ts`

```typescript
export class EnterExit {
  constructor(private vehicles: Map<EntityId, Vehicle>, private events: EventBus);

  tryEnter(playerId: EntityId, playerPos: Vec3): boolean;
  // 1. Find nearest vehicle within VEHICLE_ENTER_RADIUS (4m)
  // 2. If vehicle.state === PARKED or AI_CONTROLLED:
  //    a. vehicle.setDriver(playerId)
  //    b. vehicle.state = DRIVEN
  //    c. emit player:enterVehicle { playerId, vehicleId, seat: 'driver' }
  //    d. Return true
  // 3. Else return false

  exit(playerId: EntityId, vehicleId: EntityId): void;
  // 1. Calculate exit position: vehicle side + 2m, raycast down for Y
  // 2. vehicle.setDriver(null), state = PARKED
  // 3. emit player:exitVehicle { playerId, vehicleId, position }
}
```

### 8. `src/vehicles/VehicleCamera.ts`

```typescript
export class VehicleCamera {
  private active = false;

  activate(camera: THREE.PerspectiveCamera): void;
  deactivate(): void;

  update(vehiclePos: Vec3, heading: number, speed: number, dt: number): void;
  // Position: 3m behind, 1.5m above vehicle
  // FOV: 65 + speedKmh * 0.1 (max 80) — speed feel
  // Shake: sin wave amplitude proportional to speed on uneven terrain
  // Look ahead: target = vehiclePos + forward * 10
  // Smooth lerp position
}
```

### 9. `src/vehicles/VehicleDamage.ts`

```typescript
export class VehicleDamage {
  private health = 100;

  takeDamage(amount: number, point: Vec3): void;
  // health -= amount
  // Visual: model.setDamageLevel based on health thresholds (75, 50, 25)
  // Emit physics:collision if from collision
  // At 0: vehicle.destroy() — explosion effect event, remove from world

  getHealth(): number;
  repair(amount: number): void;
}
```

### 10. `src/vehicles/VehicleSpawner.ts`

```typescript
export class VehicleSpawner {
  spawn(type: VehicleTypeId, position: Vec3, rotation?: number): EntityId;
  despawn(entityId: EntityId): void;

  spawnInitialVehicles(): void;
  // Place 8 parked vehicles around Ocean Beach parking lot:
  //   2 sedans, 1 sportscar, 1 motorcycle, 1 truck
  //   Positions from world spawn points or hardcoded parking spots
  //   All state = PARKED
}
```

### 11. `src/vehicles/TrafficSpawnPoints.ts`

```typescript
export const TRAFFIC_SPAWN_POINTS: Array<{
  roadId: string;
  t: number;        // 0-1 along road spline
  lane: number;
  direction: 1 | -1;
}> = [
  // 30 spawn points across highway and boulevards
  // Used by Agent 7 TrafficManager
];

export function getTrafficSpawnPosition(roadNetwork: RoadNetworkData, point: typeof TRAFFIC_SPAWN_POINTS[0]): Vec3;
```

### 12. `src/vehicles/VehicleSystem.ts`

```typescript
export class VehicleSystem implements System, IVehicleService {
  name = 'vehicles' as const;

  private vehicles = new Map<EntityId, Vehicle>();
  private enterExit: EnterExit;
  private vehicleCamera: VehicleCamera;
  private activeVehicleId: EntityId | null = null;

  async init(ctx: GameContext): Promise<void> {
    this.spawner.spawnInitialVehicles();

    ctx.events.on('player:interact', () => {
      const player = ctx.getSystem('player');
      this.enterExit.tryEnter(player.getEntityId(), player.getPosition());
    });

    ctx.events.on('player:enterVehicle', ({ vehicleId, playerId }) => {
      this.activeVehicleId = vehicleId;
      this.vehicleCamera.activate(renderer.getActiveCamera());
    });

    ctx.events.on('player:exitVehicle', () => {
      this.activeVehicleId = null;
      this.vehicleCamera.deactivate();
    });
  }

  fixedUpdate(dt: number): void {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state === VehicleState.DRIVEN && vehicle.entityId === this.activeVehicleId) {
        const input = this.getDrivingInput();
        vehicle.physics.update(input, dt);
      }
    }
  }

  update(dt: number): void {
    if (this.activeVehicleId) {
      const vehicle = this.vehicles.get(this.activeVehicleId)!;
      this.vehicleCamera.update(vehicle.physics.getPosition(), vehicle.physics.getHeading(), vehicle.physics.getSpeed(), dt);
      vehicle.model.updateWheels(vehicle.physics.wheels);
    }
  }

  private getDrivingInput(): VehicleInput {
    // Read from player InputManager or direct keyboard
    // W = throttle 1, S = throttle -1 (reverse)
    // A/D = steer -1/1
    // Space = handbrake
    // S (without W) = brake
  }

  // IVehicleService
  getVehicle(entityId: EntityId): VehicleSnapshot | null;
  getPlayerVehicle(): EntityId | null;
  getNearbyVehicles(pos: Vec3, radius: number): EntityId[];
  spawnVehicle(type: VehicleTypeId, position: Vec3): EntityId;
}
```

---

## Placeholder Vehicle Models

If no glTF, procedural box vehicles:

| Type | Body | Wheels | Color |
|------|------|--------|-------|
| Sedan | 4.5×1.4×1.8 box | 4 cylinders r=0.35 | Random pastel |
| SportsCar | 4.2×1.2×1.9 box, lower | 4 cylinders r=0.32 | Red |
| Motorcycle | 2.1×1.1×0.8 box | 2 cylinders r=0.3 | Black |
| Truck | 6×2×2.2 box | 4 cylinders r=0.45 | White |
| Police | Same as sedan | — | Black + white stripe |

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `IVehicleService` | 5, 7, 9, 10 |
| `vehicle:spawn/destroy/enginePitch/speedChange` events | 7, 8, 9 |
| `TRAFFIC_SPAWN_POINTS` | 7 |
| `Vehicle` class (AI can drive) | 7 |
| Driving camera | 2 (camera) |

| You Consume | From |
|-------------|------|
| `IPhysicsService` | Agent 4 |
| `IRendererService` | Agent 2 |
| `player:enterVehicle/exitVehicle` events | Agent 5 |
| `IPlayerService` | Agent 5 |
| `MaterialLibrary` | Agent 2 |

---

## Acceptance Criteria

- [ ] 5+ vehicles spawned at Ocean Beach parking lot
- [ ] Player presses E near car → enters as driver
- [ ] WASD drives vehicle, Space handbrake drifts
- [ ] Camera switches to driving mode on enter
- [ ] Speedometer event fires with correct km/h
- [ ] Engine pitch event fires proportional to speed
- [ ] Vehicle collides with buildings and other cars
- [ ] Player exits with E, returns to third-person camera
- [ ] Sports car noticeably faster than truck
- [ ] Motorcycle handles differently (2 wheels, tips on sharp turns)
- [ ] Vehicle takes damage on collision, smoke at low health
- [ ] `npm run build` passes

---

## DO NOT

- Build traffic AI (Agent 7) — only provide spawn points
- Implement engine audio (Agent 8) — only emit events
- Build HUD speedometer (Agent 9) — only emit speedChange
- Edit folders outside `src/vehicles/`
