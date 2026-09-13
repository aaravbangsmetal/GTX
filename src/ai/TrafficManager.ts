import { MAX_TRAFFIC_VEHICLES } from '../shared/constants';
import { distance3 } from '../shared/math';
import type { EntityId, Vec3 } from '../shared/types';
import type { IPhysicsService } from '../shared/services';
import { TrafficAI, getTrafficSpawnPosition } from './TrafficAI';
import type { RoadPathfinder } from './Pathfinder';
import { TrafficLightManager } from './TrafficLightManager';
import { TRAFFIC_SPAWN_POINTS } from './traffic-spawn-points';
import type { AiIntersection, IVehicleAIControl, TrafficSpawnPoint, TrafficVehicleConfig } from './types';
import { DEFAULT_TRAFFIC_CONFIG as TRAFFIC_CONFIG } from './types';

interface TrafficEntry {
  entityId: EntityId;
  ai: TrafficAI;
}

const TRAFFIC_TYPES = ['sedan', 'sedan', 'sportscar', 'truck'] as const;
const DESPAWN_DISTANCE = 250;
const SPAWN_MIN = 150;
const SPAWN_MAX = 200;

export class TrafficManager {
  private activeTraffic = new Map<EntityId, TrafficEntry>();
  private maxVehicles = MAX_TRAFFIC_VEHICLES;
  private spawnIndex = 0;

  constructor(
    private vehicleControl: IVehicleAIControl,
    private roadPathfinder: RoadPathfinder,
    private trafficLights: TrafficLightManager,
    private physics: IPhysicsService,
    private intersections: AiIntersection[],
    private spawnPoints: TrafficSpawnPoint[] = TRAFFIC_SPAWN_POINTS,
  ) {}

  update(playerPos: Vec3, dt: number): void {
    this.trafficLights.update(dt);
    this.despawnFarTraffic(playerPos);

    if (this.activeTraffic.size < this.maxVehicles) {
      this.trySpawnTraffic(playerPos);
    }

    for (const entry of this.activeTraffic.values()) {
      entry.ai.update(dt);
    }
  }

  private despawnFarTraffic(playerPos: Vec3): void {
    for (const [id] of this.activeTraffic) {
      const state = this.vehicleControl.getState(id);
      if (!state) {
        this.removeTraffic(id);
        continue;
      }
      if (distance3(state.position, playerPos) > DESPAWN_DISTANCE) {
        this.removeTraffic(id);
      }
    }
  }

  private trySpawnTraffic(playerPos: Vec3): void {
    for (let attempt = 0; attempt < 5; attempt++) {
      const spawnPoint = this.spawnPoints[this.spawnIndex % this.spawnPoints.length];
      this.spawnIndex++;

      const spawnPos = getTrafficSpawnPosition(this.roadPathfinder, spawnPoint);
      const dist = distance3(spawnPos, playerPos);

      if (dist < SPAWN_MIN || dist > SPAWN_MAX) continue;

      const type = TRAFFIC_TYPES[Math.floor(Math.random() * TRAFFIC_TYPES.length)];
      const entityId = this.vehicleControl.spawnVehicle(type, spawnPos);
      const dest = this.roadPathfinder.getRandomRoadPoint(spawnPos, 200, 500);

      const config: TrafficVehicleConfig = { ...TRAFFIC_CONFIG, type };
      const ai = new TrafficAI(
        entityId,
        this.vehicleControl,
        this.roadPathfinder,
        this.trafficLights,
        this.physics,
        this.intersections,
        dest,
        config,
      );

      this.activeTraffic.set(entityId, { entityId, ai });
      return;
    }
  }

  private removeTraffic(entityId: EntityId): void {
    this.activeTraffic.delete(entityId);
    this.vehicleControl.despawnVehicle(entityId);
  }

  despawnAll(): void {
    for (const id of this.activeTraffic.keys()) {
      this.vehicleControl.despawnVehicle(id);
    }
    this.activeTraffic.clear();
  }

  getActiveCount(): number {
    return this.activeTraffic.size;
  }
}
