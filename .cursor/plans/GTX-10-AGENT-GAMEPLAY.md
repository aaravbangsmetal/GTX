# Agent 10: Gameplay, Missions, and Progression

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 10 |
| Branch | `agent-10-gameplay` |
| Owns | `src/gameplay/`, `public/assets/gameplay/` |
| Merge order | Wave 3 (after player spawn works) |
| Wave | 3 |

---

## Central Context

GTX is a browser GTA Vice City game. All systems exist. **You build the game** — combat, wanted level, missions, pickups, economy, save/load. You make it a GAME, not just a city simulator.

3 starter missions, 5-star wanted system, pistol/SMG combat, and localStorage save.

---

## Your Mission

Core GTA gameplay loop: shooting, wanted escalation, 3 missions, world pickups, money system, and save/load.

---

## File Checklist

```
src/gameplay/
  index.ts
  createSystem.ts
  types.ts
  GameplaySystem.ts
  WantedSystem.ts
  CombatSystem.ts
  WeaponManager.ts
  MissionManager.ts
  MissionTypes.ts
  PickupSystem.ts
  SaveSystem.ts
  Economy.ts
  CrimeDetector.ts
  missions/
    mission-01-welcome.ts
    mission-02-neighborhood.ts
    mission-03-delivery.ts
  __mocks__/
    MockPlayerService.ts
    MockPhysicsService.ts
public/assets/gameplay/
  markers/
    (mission markers are 3D objects — cone/sphere, rendered via Agent 2 scene)
```

---

## Detailed Implementation Spec

### 1. `src/gameplay/types.ts`

```typescript
export interface WeaponConfig {
  id: string;
  name: string;
  type: 'melee' | 'pistol' | 'smg' | 'shotgun';
  damage: number;
  range: number;
  fireRate: number;     // shots per second
  magazineSize: number;
  reloadTime: number;    // seconds
  spread: number;        // radians
  isAutomatic: boolean;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  objectives: MissionObjective[];
  reward: number;
  prerequisites: string[];  // mission IDs that must be complete first
  onStart?: (ctx: GameContext) => void;
  onComplete?: (ctx: GameContext) => void;
  onFail?: (ctx: GameContext) => void;
}

export type MissionType = 'goto' | 'elimination' | 'delivery' | 'chase' | 'collect';

export interface MissionObjective {
  id: string;
  description: string;
  type: 'reach' | 'kill' | 'collect' | 'deliver' | 'survive' | 'timer';
  target?: string;        // entity ID, location ID, item ID
  position?: Vec3;
  radius?: number;
  count?: number;
  timeLimit?: number;     // seconds
  completed: boolean;
}

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: Vec3;
    health: number;
    armor: number;
    money: number;
    weaponId: string | null;
    ammo: Record<string, number>;
  };
  missions: {
    completed: string[];
    active: string | null;
    objectiveProgress: Record<string, boolean>;
  };
  wanted: {
    level: number;
  };
  settings: Record<string, unknown>;
}

export interface PickupConfig {
  type: 'health' | 'armor' | 'weapon' | 'money' | 'ammo';
  value: number | string;
  position: Vec3;
  respawnTime: number;  // seconds, 0 = no respawn
}
```

### 2. `src/gameplay/WeaponManager.ts`

```typescript
export const WEAPONS: Record<string, WeaponConfig> = {
  fists: { id: 'fists', name: 'Fists', type: 'melee', damage: 10, range: 2, fireRate: 2, magazineSize: 0, reloadTime: 0, spread: 0, isAutomatic: false },
  pistol: { id: 'pistol', name: 'Pistol', type: 'pistol', damage: 25, range: 50, fireRate: 3, magazineSize: 12, reloadTime: 1.5, spread: 0.02, isAutomatic: false },
  smg: { id: 'smg', name: 'SMG', type: 'smg', damage: 15, range: 40, fireRate: 10, magazineSize: 30, reloadTime: 2.0, spread: 0.05, isAutomatic: true },
};

export class WeaponManager {
  private currentWeapon = 'fists';
  private ammo: Record<string, number> = { pistol: 0, smg: 0 };
  private lastFireTime = 0;
  private isReloading = false;

  getCurrentWeapon(): WeaponConfig;
  getAmmo(weaponId: string): number;
  switchWeapon(weaponId: string): boolean;
  canFire(): boolean;

  fire(origin: Vec3, direction: Vec3): void;
  // 1. Check fireRate cooldown
  // 2. Check ammo (if ranged)
  // 3. Decrement ammo
  // 4. Apply spread to direction
  // 5. Emit combat:shoot { origin, direction, weaponId }

  reload(): void;
  addAmmo(weaponId: string, amount: number): void;
  giveWeapon(weaponId: string, ammo: number): void;
}
```

### 3. `src/gameplay/CombatSystem.ts`

```typescript
export class CombatSystem {
  constructor(
    private weapons: WeaponManager,
    private physics: IPhysicsService,
    private events: EventBus,
  );

  init(): void;
  // Listen for combat:shoot → perform hit detection

  processShot(origin: Vec3, direction: Vec3, weapon: WeaponConfig): void;
  // 1. Raycast from origin along direction, maxDist = weapon.range
  //    collision mask: NPC | PLAYER (not static for ranged)
  // 2. If hit:
  //    a. Emit combat:hit { targetId, damage, position }
  //    b. Apply damage to target (NPC via AI, player via PlayerState)
  // 3. For melee: short range raycast (2m)

  applyDamage(targetId: EntityId, damage: number, source: EntityId): void;
  // NPC: find in AI system, call npc.takeDamage()
  // Player: reduce health via IPlayerService

  update(dt: number): void;
  // Handle automatic weapon fire (if mouse held and isAutomatic)
  // Handle reload timer
}
```

### 4. `src/gameplay/WantedSystem.ts`

```typescript
export class WantedSystem {
  private level = 0;
  private decayTimer = 0;
  private hiddenTimer = 0;
  private isHidden = false;  // out of police sight

  constructor(private events: EventBus);

  getLevel(): number;
  addStar(amount: number = 1): void;
  removeStar(): void;
  clear(): void;

  update(dt: number, playerPos: Vec3): void;
  // Decay logic:
  // - If level > 0 and no crime for 30s → start decay timer
  // - If police can see player → reset decay
  // - If hidden (no police within 100m with line of sight) for 30s per star → remove 1 star
  // - Emit wanted:levelChange on any change

  // Crime severity:
  // shoot civilian: +1 star
  // kill civilian: +1 star
  // steal car: +1 star
  // shoot police: +2 stars
  // kill police: +2 stars
  // explode vehicle near police: +1 star
}
```

**Wanted escalation table:**
| Stars | Police Response | Decay Time |
|-------|----------------|------------|
| 0 | None | — |
| 1 | Radio chatter (audio event) | 30s hidden |
| 2 | 1 police car | 30s hidden per star |
| 3 | 2 police cars + roadblock | 45s hidden per star |
| 4 | 3 police cars + SWAT | 60s hidden per star |
| 5 | Maximum response | 60s hidden per star |

### 5. `src/gameplay/CrimeDetector.ts`

```typescript
export class CrimeDetector {
  constructor(private wanted: WantedSystem, private events: EventBus);

  init(): void;
  // Listen for:
  // combat:hit → if target is NPC/civilian: +1 star, if police: +2 stars
  // ai:npcDeath → if caused by player: +1 star
  // player:enterVehicle → if vehicle was AI_CONTROLLED or PARKED (not player's): +1 star (car theft)
  // physics:collision → if player vehicle hits pedestrian at speed > 20km/h: +1 star
}
```

### 6. `src/gameplay/MissionTypes.ts`

```typescript
export class MissionObjectiveChecker {
  check(objective: MissionObjective, ctx: MissionContext): boolean;

  // 'reach': player within objective.radius of objective.position
  // 'kill': count NPCs of target type killed >= objective.count
  // 'collect': player has collected objective.count of target item
  // 'deliver': player within radius of delivery position while carrying item
  // 'survive': timer elapsed without dying
  // 'timer': mission completed within timeLimit
}

export interface MissionContext {
  playerPos: Vec3;
  playerVehicle: EntityId | null;
  kills: Record<string, number>;
  collected: Record<string, number>;
  elapsed: number;
  playerDead: boolean;
}
```

### 7. `src/gameplay/MissionManager.ts`

```typescript
export class MissionManager {
  private missions: Map<string, MissionDefinition>;
  private activeMission: MissionDefinition | null = null;
  private completedMissions: Set<string> = new Set();
  private missionContext: MissionContext;
  private missionTimer = 0;

  constructor(private events: EventBus, private economy: Economy);

  init(): void;
  // Register all mission definitions from missions/ folder

  startMission(missionId: string): boolean;
  // 1. Check prerequisites met
  // 2. Set activeMission
  // 3. Reset missionContext
  // 4. Emit mission:start { missionId, title, objective }
  // 5. Call mission.onStart
  // 6. Spawn mission markers in world (3D cones via renderer)

  update(dt: number, playerPos: Vec3): void;
  // 1. If no active mission: check if player near mission giver → offer mission
  // 2. Check each objective via MissionObjectiveChecker
  // 3. Update mission:update with progress
  // 4. If all objectives complete → completeMission()
  // 5. If timer expired on timed mission → failMission()
  // 6. If player dead → failMission()

  completeMission(): void;
  // 1. Add reward money via Economy
  // 2. Add to completedMissions
  // 3. Emit mission:complete { missionId, reward }
  // 4. Emit ui:notification "MISSION PASSED!"
  // 5. Call mission.onComplete
  // 6. Clear activeMission

  failMission(reason: string): void;
  // Emit mission:fail, ui:notification "MISSION FAILED!"

  isCompleted(missionId: string): boolean;
  getActiveMission(): MissionDefinition | null;
}
```

### 8. Mission Definitions

**Mission 1: `mission-01-welcome.ts`**
```typescript
export const MISSION_01: MissionDefinition = {
  id: 'mission-01-welcome',
  title: 'Welcome to Vice City',
  description: 'Get behind the wheel and drive to Downtown.',
  type: 'goto',
  reward: 500,
  prerequisites: [],
  objectives: [
    {
      id: 'enter-vehicle',
      description: 'Enter a vehicle',
      type: 'reach',  // custom: check isInVehicle
      completed: false,
    },
    {
      id: 'drive-downtown',
      description: 'Drive to the Downtown marker',
      type: 'reach',
      position: { x: -50, y: 2, z: 100 },
      radius: 20,
      completed: false,
    },
  ],
};
```

**Mission 2: `mission-02-neighborhood.ts`**
```typescript
export const MISSION_02: MissionDefinition = {
  id: 'mission-02-neighborhood',
  title: 'Neighborhood Watch',
  description: 'Some punks are causing trouble in Little Havana. Take care of them.',
  type: 'elimination',
  reward: 1000,
  prerequisites: ['mission-01-welcome'],
  objectives: [
    {
      id: 'go-havana',
      description: 'Go to Little Havana',
      type: 'reach',
      position: { x: -400, y: 2, z: 50 },
      radius: 30,
      completed: false,
    },
    {
      id: 'kill-hostiles',
      description: 'Eliminate 3 hostiles',
      type: 'kill',
      target: 'hostile',
      count: 3,
      completed: false,
    },
  ],
  onStart: (ctx) => {
    // Spawn 3 hostile NPCs in Little Havana via event
    // emit 'gameplay:spawnHostiles' { count: 3, position: ... }
  },
};
```

**Mission 3: `mission-03-delivery.ts`**
```typescript
export const MISSION_03: MissionDefinition = {
  id: 'mission-03-delivery',
  title: 'Express Delivery',
  description: 'Pick up a package at the docks and deliver it to Starfish Island. You have 3 minutes.',
  type: 'delivery',
  reward: 2000,
  prerequisites: ['mission-02-neighborhood'],
  objectives: [
    {
      id: 'pickup-package',
      description: 'Pick up the package at Vice Port',
      type: 'collect',
      target: 'package',
      position: { x: -300, y: 2, z: -400 },
      radius: 5,
      count: 1,
      completed: false,
    },
    {
      id: 'deliver-package',
      description: 'Deliver to Starfish Island',
      type: 'deliver',
      position: { x: 100, y: 2, z: 600 },
      radius: 10,
      timeLimit: 180,
      completed: false,
    },
  ],
};
```

### 9. `src/gameplay/PickupSystem.ts`

```typescript
export const WORLD_PICKUPS: PickupConfig[] = [
  { type: 'health', value: 25, position: { x: 150, y: 1, z: -50 }, respawnTime: 60 },
  { type: 'health', value: 25, position: { x: -100, y: 1, z: 0 }, respawnTime: 60 },
  { type: 'armor', value: 25, position: { x: -50, y: 1, z: 100 }, respawnTime: 90 },
  { type: 'weapon', value: 'pistol', position: { x: -400, y: 1, z: 50 }, respawnTime: 0 },
  { type: 'money', value: 100, position: { x: 200, y: 1, z: -200 }, respawnTime: 120 },
  // 10+ pickups across the map
];

export class PickupSystem {
  private activePickups: Map<string, PickupInstance> = new Map();
  private meshes: Map<string, THREE.Object3D> = new Map();

  init(ctx: GameContext): void;
  // Spawn pickup meshes in scene (glowing rotating shapes):
  //   health: red cross (box)
  //   armor: blue shield (box)
  //   weapon: gun shape (box)
  //   money: green dollar sign (box)
  //   ammo: yellow box

  update(dt: number, playerPos: Vec3): void;
  // Check distance to each pickup
  // If < 2m: collect
  //   health → player.setHealth(health + value)
  //   armor → player.setArmor(armor + value)
  //   weapon → weaponManager.giveWeapon(id, ammo)
  //   money → economy.add(value)
  //   Emit pickup:collected
  //   Remove mesh, start respawn timer if respawnTime > 0

  // Animate: rotate + bob up/down
}
```

### 10. `src/gameplay/Economy.ts`

```typescript
export class Economy {
  private money = 0;

  getMoney(): number;
  add(amount: number): void;
  spend(amount: number): boolean;  // returns false if insufficient
  canAfford(amount: number): boolean;
  // Money displayed via player:stateChange → HUD
}
```

### 11. `src/gameplay/SaveSystem.ts`

```typescript
export class SaveSystem {
  private static SAVE_KEY = 'gtx-save';
  private static SAVE_VERSION = 1;

  save(ctx: GameContext): void;
  // Collect: player position/health/armor/money/weapon/ammo
  //          completed missions, active mission progress
  //          wanted level
  //          settings from UI
  // Write to localStorage as JSON
  // Emit save:complete

  load(ctx: GameContext): boolean;
  // Read from localStorage
  // Validate version
  // Restore player state via IPlayerService.teleport(), setHealth, etc.
  // Restore mission progress
  // Restore wanted level
  // Emit save:loaded
  // Return true if save existed

  hasSave(): boolean;
  deleteSave(): void;
}
```

### 12. `src/gameplay/GameplaySystem.ts`

```typescript
export class GameplaySystem implements System {
  name = 'gameplay' as const;

  private wanted: WantedSystem;
  private combat: CombatSystem;
  private weapons: WeaponManager;
  private missions: MissionManager;
  private pickups: PickupSystem;
  private economy: Economy;
  private save: SaveSystem;
  private crime: CrimeDetector;

  async init(ctx: GameContext): Promise<void> {
    this.wanted = new WantedSystem(ctx.events);
    this.weapons = new WeaponManager();
    this.combat = new CombatSystem(this.weapons, ctx.getSystem('physics'), ctx.events);
    this.economy = new Economy();
    this.missions = new MissionManager(ctx.events, this.economy);
    this.pickups = new PickupSystem();
    this.save = new SaveSystem();
    this.crime = new CrimeDetector(this.wanted, ctx.events);

    this.combat.init();
    this.crime.init();
    this.missions.init();
    this.pickups.init(ctx);

    // Auto-start mission 1 after 3 seconds
    setTimeout(() => this.missions.startMission('mission-01-welcome'), 3000);

    // Listen for save requests from UI
    ctx.events.on('game:pause', () => { /* offer save */ });
  }

  fixedUpdate(dt: number): void {
    this.combat.update(dt);
  }

  update(dt: number): void {
    const player = ctx.getSystem('player');
    const pos = player.getPosition();

    this.wanted.update(dt, pos);
    this.missions.update(dt, pos);
    this.pickups.update(dt, pos);

    // Sync player state with economy/wanted
    // Emit player:stateChange with updated money/wanted
  }
}
```

---

## Mission Markers (3D)

Spawn visible markers at objective positions:

```typescript
function createMissionMarker(position: Vec3, color: number): THREE.Object3D {
  // Yellow cone (reach), red (kill), green (delivery)
  // Rotate, bob animation
  // Add to scene via IRendererService
  // Add cylinder trigger zone (invisible, radius check)
}
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| Combat, missions, wanted, saves | full game loop |
| `wanted:levelChange` | 7 (police), 9 (stars), 8 (sirens) |
| `mission:*` events | 9 (UI) |
| `combat:shoot/hit` | 4, 7, 8 |
| `pickup:collected` | 8, 9 |
| Hostile NPC spawn request | 7 |

| You Consume | From |
|-------------|------|
| `IPhysicsService.raycast()` | 4 |
| `IPlayerService` (state, teleport, damage) | 5 |
| `IRendererService` (mission markers) | 2 |
| `IWorldService.getSpawnPoint()` | 3 |
| NPC damage/death | 7 |

---

## Acceptance Criteria

- [ ] Player can shoot pistol (left click), raycast hits NPCs
- [ ] NPCs die from gunshots, emit ai:npcDeath
- [ ] Wanted level rises on crimes (shoot, steal car, hit pedestrian)
- [ ] Wanted stars decay when hidden from police
- [ ] Mission 1: enter car → drive to Downtown → "MISSION PASSED!" + $500
- [ ] Mission 2: go to Little Havana → kill 3 hostiles → reward
- [ ] Mission 3: pickup package → deliver to Starfish Island within 3 min
- [ ] Pickups collectible (health, armor, weapons, money)
- [ ] Save game to localStorage, reload restores position/stats/missions
- [ ] Weapon switching works (fists ↔ pistol)
- [ ] Reload mechanic (R key when armed)
- [ ] `npm run build` passes

---

## DO NOT

- Build HUD (Agent 9) — emit events
- Spawn police (Agent 7) — emit wanted:levelChange
- Play sounds (Agent 8) — emit events
- Edit folders outside `src/gameplay/` and `public/assets/gameplay/`
