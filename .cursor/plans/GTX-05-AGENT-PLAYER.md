# Agent 5: Player Character and Controls

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 5 |
| Branch | `agent-05-player` |
| Owns | `src/player/`, `public/assets/player/` |
| Merge order | Wave 2 (after Wave 1 integration) |
| Wave | 2 |

---

## Central Context

GTX is a browser GTA Vice City game. Wave 1 is merged: core loop, renderer, world, physics all exist. **You build the player** — third-person character, WASD movement, camera, input, animations, and player state that HUD/gameplay systems read.

Player spawns at Ocean Beach (200, 2, -150). Must walk on city streets with building collision, sprint, jump, and interact with vehicles (E key stub).

---

## Your Mission

GTA-style third-person on-foot controller with pointer-lock mouse look, capsule physics, animation state machine, and `IPlayerService` for other agents.

---

## File Checklist

```
src/player/
  index.ts
  createSystem.ts
  types.ts
  PlayerSystem.ts
  PlayerController.ts
  ThirdPersonCamera.ts
  PlayerModel.ts
  PlayerAnimator.ts
  InputManager.ts
  PlayerPhysics.ts
  PlayerState.ts
  PlayerConfig.ts
  __mocks__/
    MockPhysicsService.ts
    MockRendererService.ts
public/assets/player/
  models/
    player.glb
  animations/
    (embedded in glb: idle, walk, run, jump, enter_vehicle)
```

---

## Detailed Implementation Spec

### 1. `src/player/types.ts`

```typescript
export enum PlayerAnimState {
  IDLE, WALK, RUN, JUMP, FALL, LAND,
  ENTER_VEHICLE, EXIT_VEHICLE, DRIVE,
  AIM, SHOOT, MELEE, DEATH
}

export enum PlayerMode {
  ON_FOOT, IN_VEHICLE_DRIVER, IN_VEHICLE_PASSENGER, CUTSCENE, DEAD
}

export interface PlayerConfig {
  walkSpeed: number;      // 4 m/s
  runSpeed: number;       // 8 m/s
  sprintSpeed: number;    // 12 m/s
  jumpForce: number;      // 6 m/s upward
  rotationSpeed: number;  // camera mouse sensitivity
  cameraDistance: number; // 5m default
  cameraHeight: number;   // 2m above player
  cameraMinDist: number;  // 2m
  cameraMaxDist: number;  // 10m
  capsuleRadius: number;  // 0.4m
  capsuleHeight: number;  // 1.8m
  maxHealth: number;      // 100
  maxArmor: number;       // 100
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  enterPassenger: boolean;
  attack: boolean;
  aim: boolean;
  mouseX: number;
  mouseY: number;
  scrollDelta: number;
}
```

### 2. `src/player/PlayerConfig.ts`

```typescript
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  walkSpeed: 4,
  runSpeed: 8,
  sprintSpeed: 12,
  jumpForce: 6,
  rotationSpeed: 0.002,
  cameraDistance: 5,
  cameraHeight: 2,
  cameraMinDist: 2,
  cameraMaxDist: 10,
  capsuleRadius: 0.4,
  capsuleHeight: 1.8,
  maxHealth: 100,
  maxArmor: 100,
};
```

### 3. `src/player/InputManager.ts`

```typescript
export class InputManager {
  private state: InputState;
  private pointerLocked = false;
  private gamepadIndex: number | null = null;

  init(canvas: HTMLCanvasElement): void;
  update(): InputState;
  isPointerLocked(): boolean;

  // Keyboard:
  // W/ArrowUp → forward, S/ArrowDown → backward
  // A/ArrowLeft → left, D/ArrowRight → right
  // Shift → sprint, Space → jump
  // E → interact, F → enterPassenger
  // Left mouse → attack (when pointer locked)
  // Right mouse → aim
  // Tab → emit event for minimap toggle (Agent 9)
  // Escape → emit event for pause (Agent 9)

  // Mouse:
  // Click canvas → requestPointerLock
  // mousemove → update mouseX/mouseY (only when locked)
  // wheel → scrollDelta (camera zoom)

  // Gamepad (optional):
  // Left stick → movement, Right stick → camera
  // A → jump, X → interact, RT → sprint

  // Prevent default on game keys when pointer locked
  // Release all keys on pointer unlock
}
```

### 4. `src/player/PlayerPhysics.ts`

```typescript
export class PlayerPhysics {
  private bodyId: number;
  private grounded = false;
  private velocity = vec3();

  constructor(private physics: IPhysicsService, private config: PlayerConfig);

  init(position: Vec3): void;
  // Create capsule body via physics.createBody:
  //   shape: 'capsule', radius: 0.4, height: 1.8, mass: 80
  //   group: PLAYER, mask: COLLISION_MASKS.PLAYER

  applyMovement(direction: Vec3, speed: number, dt: number): void;
  // Set horizontal velocity, preserve vertical (gravity)
  // Direction is world-space, already camera-relative

  jump(): void;
  // If grounded: set velocity.y = jumpForce

  checkGrounded(): boolean;
  // Raycast downward from capsule center, 1.1m, mask STATIC
  // Update this.grounded

  getPosition(): Vec3;
  getVelocity(): Vec3;
  teleport(position: Vec3): void;
  setEnabled(enabled: boolean): void;
  // Disable body when in vehicle (kinematic/removed from world)
}
```

### 5. `src/player/ThirdPersonCamera.ts`

```typescript
export class ThirdPersonCamera {
  private yaw = 0;
  private pitch = 0.3;  // radians, slightly above horizontal
  private distance: number;
  private target: THREE.Vector3;

  constructor(private camera: THREE.PerspectiveCamera, private config: PlayerConfig, private physics: IPhysicsService);

  update(playerPos: Vec3, input: InputState, dt: number): void;

  // Mouse input:
  // yaw -= input.mouseX * rotationSpeed
  // pitch -= input.mouseY * rotationSpeed
  // pitch clamped: -0.5 to 1.2 radians
  // distance += input.scrollDelta * 0.5
  // distance clamped: cameraMinDist to cameraMaxDist

  // Camera position:
  // offset = (sin(yaw)*cos(pitch)*distance, sin(pitch)*distance + cameraHeight, cos(yaw)*cos(pitch)*distance)
  // desiredPos = playerPos + offset

  // Collision avoidance:
  // Raycast from playerPos to desiredPos
  // If hit: pull camera to hit.point - normal * 0.3
  // Smooth: lerp current position to desired over 0.1s

  // Camera lookAt: playerPos + (0, 1.5, 0) (head height)

  setDistance(d: number): void;
  getYaw(): number;  // used for movement direction
}
```

### 6. `src/player/PlayerModel.ts`

```typescript
export class PlayerModel {
  private group: THREE.Group;
  private mixer: THREE.AnimationMixer | null = null;

  async load(assets: AssetLoader, scene: THREE.Scene): Promise<void>;
  // Load player.glb
  // If no gltf available: create placeholder
  //   - Capsule body visual (cylinder + sphere head)
  //   - Blue shirt, tan skin, dark pants
  // Scale: 1.8m tall
  // Position offset: Y = 0 (feet at ground)

  getMesh(): THREE.Group;
  getMixer(): THREE.AnimationMixer | null;
  setVisible(visible: boolean): void;
  // Hidden when in vehicle
}
```

### 7. `src/player/PlayerAnimator.ts`

```typescript
export class PlayerAnimator {
  private currentState: PlayerAnimState = PlayerAnimState.IDLE;
  private actions = new Map<PlayerAnimState, THREE.AnimationAction>();

  init(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]): void;
  // Map clips by name: 'idle', 'walk', 'run', 'jump', 'fall'

  setState(state: PlayerAnimState): void;
  // Crossfade: 0.2s between states
  // JUMP → FALL (when velocity.y < 0) → LAND → IDLE
  // RUN: speed > 8, WALK: speed > 0.5

  update(dt: number, speed: number, grounded: boolean): void;
}
```

### 8. `src/player/PlayerState.ts`

```typescript
export class PlayerStateManager {
  private state: {
    health: number;
    armor: number;
    money: number;
    wantedLevel: number;
    weaponId: string | null;
    mode: PlayerMode;
    vehicleId: EntityId | null;
  };

  getSnapshot(): PlayerStateSnapshot;
  setHealth(v: number): void;   // clamp 0-max, emit player:stateChange
  setArmor(v: number): void;
  addMoney(amount: number): void;
  setWantedLevel(level: number): void;
  setWeapon(id: string | null): void;
  setMode(mode: PlayerMode, vehicleId?: EntityId): void;
  isAlive(): boolean;
}
```

### 9. `src/player/PlayerController.ts`

```typescript
export class PlayerController {
  constructor(
    private input: InputManager,
    private physics: PlayerPhysics,
    private camera: ThirdPersonCamera,
    private animator: PlayerAnimator,
    private state: PlayerStateManager,
    private config: PlayerConfig,
  );

  update(dt: number): void {
    if (this.state.getSnapshot().mode !== PlayerMode.ON_FOOT) return;

    const input = this.input.update();
    const pos = this.physics.getPosition();

    // Movement direction relative to camera yaw:
    const forward = vec3(-Math.sin(camera.getYaw()), 0, -Math.cos(camera.getYaw()));
    const right = vec3(Math.cos(camera.getYaw()), 0, -Math.sin(camera.getYaw()));
    let moveDir = vec3();
    if (input.forward) moveDir = add(moveDir, forward);
    if (input.backward) moveDir = sub(moveDir, forward);
    if (input.left) moveDir = sub(moveDir, right);
    if (input.right) moveDir = add(moveDir, right);
    moveDir = normalize3(moveDir);

    const speed = input.sprint ? config.sprintSpeed : (moveDir.length() > 0 ? config.runSpeed : 0);
    this.physics.applyMovement(moveDir, speed, dt);

    if (input.jump) this.physics.jump();

    // Interact: check nearby vehicles
    if (input.interact) this.tryEnterVehicle(pos);

    this.camera.update(pos, input, dt);
    this.animator.update(dt, speed, this.physics.checkGrounded());

    // Emit player:move every frame
    // Emit player:stateChange when state changes
  }

  private tryEnterVehicle(pos: Vec3): void {
    // Emit player:interactPrompt or player:enterVehicle
    // Actual vehicle check deferred to Agent 6 integration
    // For now: emit event with null target (stub)
  }
}
```

### 10. `src/player/PlayerSystem.ts`

```typescript
export class PlayerSystem implements System, IPlayerService {
  name = 'player' as const;

  private controller: PlayerController;
  private input: InputManager;
  private physics: PlayerPhysics;
  private camera: ThirdPersonCamera;
  private model: PlayerModel;
  private animator: PlayerAnimator;
  private state: PlayerStateManager;
  private entityId: EntityId;

  async init(ctx: GameContext): Promise<void> {
 const renderer = ctx.getSystem('renderer');
    const physics = ctx.getSystem('physics');
    const world = ctx.getSystem('world');

    const spawnPos = world.getSpawnPoint('player');
    this.entityId = ctx.registry.get('core').entities.createEntity();

    this.input.init(ctx.canvas);
    this.model.load(ctx.assets, renderer.getScene());
    this.physics.init(spawnPos);
    this.camera = new ThirdPersonCamera(renderer.getActiveCamera(), ...);
    renderer.getActiveCamera() → use this camera

    // Bind physics body to model mesh
    physics.bodyMeshSync.bind(this.physics.bodyId, this.model.getMesh());

    this.controller = new PlayerController(...);

    ctx.events.emit('player:spawn', { entityId: this.entityId, position: spawnPos });
  }

  fixedUpdate(dt: number): void {
    this.controller.update(dt);  // movement in fixed step
  }

  update(dt: number): void {
    this.camera.update(...);  // camera in variable step for smoothness
    this.animator.getMixer()?.update(dt);
  }

  // IPlayerService
  getState(): PlayerStateSnapshot;
  getEntityId(): EntityId;
  getPosition(): Vec3;
  isControllable(): boolean;
  teleport(position: Vec3): void;

  // Listen for player:enterVehicle → setMode(IN_VEHICLE), hide model, disable physics
  // Listen for player:exitVehicle → setMode(ON_FOOT), show model, enable physics, teleport
}
```

---

## Placeholder Player Model (If No glTF)

Procedural low-poly character (~300 triangles):

```
     [head]     sphere r=0.15, Y=1.65
    /  |  \
 [torso]      box 0.5×0.6×0.25, Y=1.2
  /     \
[L arm][R arm]  boxes 0.15×0.5×0.15
  |     |
[L leg][R leg]  boxes 0.18×0.8×0.18
```

Materials: `character-skin`, `character-clothes` (blue shirt), dark gray pants.

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `IPlayerService` (state, position, teleport) | 3, 6, 9, 10 |
| `player:spawn/move/stateChange/death` events | 3, 7, 8, 9, 10 |
| `player:enterVehicle/exitVehicle` events | 6, 8, 9 |
| `player:interactPrompt` events | 9 |
| Active camera control | 2 (camera rig) |

| You Consume | From |
|-------------|------|
| `IPhysicsService` | Agent 4 |
| `IRendererService` | Agent 2 |
| `IWorldService.getSpawnPoint()` | Agent 3 |
| `MaterialLibrary` | Agent 2 |

---

## Acceptance Criteria

- [ ] Player spawns at Ocean Beach (200, 2, -150)
- [ ] WASD movement relative to camera direction
- [ ] Sprint (Shift) at 12 m/s, walk at 8 m/s
- [ ] Jump (Space) with gravity and ground detection
- [ ] Third-person camera orbits with mouse, zooms with scroll
- [ ] Camera doesn't clip through buildings (raycast pull-in)
- [ ] Pointer lock on canvas click
- [ ] Player collides with buildings (no walking through walls)
- [ ] Animation states transition: idle ↔ walk ↔ run ↔ jump
- [ ] PlayerState snapshot available (health 100, armor 0, money 0)
- [ ] E key emits interact event (vehicle enter stub)
- [ ] Player hidden/disabled when enterVehicle event received
- [ ] `npm run build` passes

---

## DO NOT

- Implement vehicle driving (Agent 6)
- Build HUD (Agent 9)
- Implement combat damage (Agent 10)
- Edit folders outside `src/player/` and `public/assets/player/`
