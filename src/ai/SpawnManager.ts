import { MAX_PEDESTRIANS } from '../shared/constants';
import { distance3 } from '../shared/math';
import { DistrictId, type EntityId, type Vec3 } from '../shared/types';
import type { IPhysicsService, IRendererService } from '../shared/services';
import type { EventBus } from '../shared/events';
import { createPedestrianBehaviorTree } from './PedestrianAI';
import { NPC } from './NPC';
import type { PedestrianPathfinder } from './Pathfinder';
import { NPCType, PED_DESPAWN_DISTANCE, DEFAULT_PEDESTRIAN_CONFIG } from './types';

const SPAWN_RADIUS = 60;

const DISTRICT_DENSITY: Record<DistrictId, number> = {
  [DistrictId.OCEAN_BEACH]: 0.6,
  [DistrictId.DOWNTOWN]: 1.0,
  [DistrictId.LITTLE_HAVANA]: 0.9,
  [DistrictId.VICE_PORT]: 0.3,
  [DistrictId.STARFISH_ISLAND]: 0.2,
};

export class SpawnManager {
  private activeNPCs = new Map<EntityId, NPC>();
  private maxPeds = MAX_PEDESTRIANS;
  private nextEntityId = 10000;
  private spawnCooldown = 0;

  constructor(
    private pedPathfinder: PedestrianPathfinder,
    private physics: IPhysicsService,
    private renderer: IRendererService,
    private events: EventBus,
  ) {}

  update(
    playerPos: Vec3,
    district: DistrictId,
    dt: number,
    playerDistFn: (pos: Vec3) => number,
    wantedLevel: number,
  ): void {
    this.spawnCooldown -= dt;
    this.despawnFarNPCs(playerPos);

    const density = DISTRICT_DENSITY[district] ?? 0.5;
    const targetCount = Math.floor(this.maxPeds * density);

    if (this.activeNPCs.size < targetCount && this.spawnCooldown <= 0) {
      const spawnPos = this.pedPathfinder.getRandomWalkablePoint(playerPos, SPAWN_RADIUS);
      if (distance3(spawnPos, playerPos) < SPAWN_RADIUS) {
        this.spawnNPC(NPCType.PEDESTRIAN, spawnPos);
        this.spawnCooldown = 0.5 / density;
      }
    }

    for (const npc of this.activeNPCs.values()) {
      const playerDist = playerDistFn(npc.position);
      npc.update(dt, {
        playerPos,
        playerDist,
        wantedLevel,
        deltaTime: dt,
        pedPathfinder: this.pedPathfinder,
      });
    }

    for (const [id, npc] of this.activeNPCs) {
      if (npc.shouldRemove()) {
        this.despawnNPC(id);
      }
    }
  }

  private despawnFarNPCs(playerPos: Vec3): void {
    for (const [id, npc] of this.activeNPCs) {
      if (distance3(npc.position, playerPos) > PED_DESPAWN_DISTANCE) {
        this.despawnNPC(id);
      }
    }
  }

  spawnNPC(type: NPCType, position: Vec3): EntityId {
    const entityId = this.nextEntityId++;
    const config = { ...DEFAULT_PEDESTRIAN_CONFIG, type };
    const tree = createPedestrianBehaviorTree();
    const npc = new NPC(entityId, config, position, this.physics, tree, this.events);

    void npc.initModel().then(() => {
      this.renderer.addToScene(npc.model.getMesh());
    });

    this.activeNPCs.set(entityId, npc);
    this.events.emit('ai:npcSpawn', { npcId: entityId, type: NPCType[type].toLowerCase() });
    return entityId;
  }

  despawnNPC(entityId: EntityId): void {
    const npc = this.activeNPCs.get(entityId);
    if (!npc) return;
    this.renderer.removeFromScene(npc.model.getMesh());
    npc.dispose();
    this.activeNPCs.delete(entityId);
  }

  getActiveNPCs(): Map<EntityId, NPC> {
    return this.activeNPCs;
  }

  getNPCsInRadius(center: Vec3, radius: number): NPC[] {
    const result: NPC[] = [];
    for (const npc of this.activeNPCs.values()) {
      if (distance3(npc.position, center) <= radius) {
        result.push(npc);
      }
    }
    return result;
  }

  fleeNPCsInRadius(center: Vec3, radius: number, pedPathfinder: PedestrianPathfinder): void {
    for (const npc of this.getNPCsInRadius(center, radius)) {
      npc.fleeFrom(center);
      const dest = pedPathfinder.getRandomWalkablePoint(npc.position, 30);
      npc.path = pedPathfinder.findPath(npc.position, dest);
    }
  }
}
