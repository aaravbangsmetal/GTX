import { distance3, normalize3 } from '../shared/math';
import type { EntityId, Vec3 } from '../shared/types';
import type { RoadPathfinder } from './Pathfinder';
import type { IVehicleAIControl } from './types';

interface PoliceUnit {
  entityId: EntityId;
  pathUpdateTimer: number;
  path: Vec3[];
  pathIndex: number;
}

const PATH_UPDATE_INTERVAL = 2;
const SPAWN_DISTANCE = 100;
const RAM_DISTANCE = 8;
const CHASE_SPEED_FACTOR = 0.9;

export class PoliceAI {
  private activePolice = new Map<EntityId, PoliceUnit>();
  private wantedLevel = 0;
  private vehicleControl: IVehicleAIControl;
  private roadPathfinder: RoadPathfinder;

  constructor(vehicleControl: IVehicleAIControl, roadPathfinder: RoadPathfinder) {
    this.vehicleControl = vehicleControl;
    this.roadPathfinder = roadPathfinder;
  }

  onWantedLevelChange(level: number, playerPos: Vec3): void {
    const previous = this.wantedLevel;
    this.wantedLevel = level;

    if (level === 0) {
      this.despawnAll();
      return;
    }

    if (level === 1) {
      return;
    }

    if (level >= 2 && previous < 2) {
      this.spawnPoliceUnit(playerPos);
    }

    if (level >= 3 && previous < 3) {
      this.spawnPoliceUnit(playerPos);
    }

    if (level >= 4 && previous < 4) {
      this.spawnPoliceUnit(playerPos);
    }

    if (level >= 5 && previous < 5) {
      this.spawnPoliceUnit(playerPos);
    }
  }

  update(playerPos: Vec3, dt: number): void {
    for (const unit of this.activePolice.values()) {
      unit.pathUpdateTimer -= dt;

      if (unit.pathUpdateTimer <= 0) {
        unit.path = this.roadPathfinder.findPath(
          this.vehicleControl.getState(unit.entityId)?.position ?? playerPos,
          playerPos,
        );
        unit.pathIndex = 0;
        unit.pathUpdateTimer = PATH_UPDATE_INTERVAL;
      }

      this.chasePlayer(unit, playerPos, dt);
    }
  }

  private chasePlayer(unit: PoliceUnit, playerPos: Vec3, _dt: number): void {
    const state = this.vehicleControl.getState(unit.entityId);
    if (!state) return;

    const distToPlayer = distance3(state.position, playerPos);

    if (distToPlayer < RAM_DISTANCE) {
      const dir = normalize3({
        x: playerPos.x - state.position.x,
        y: 0,
        z: playerPos.z - state.position.z,
      });
      const targetHeading = Math.atan2(dir.x, dir.z);
      const headingDiff = targetHeading - state.heading;
      this.vehicleControl.setAIInput(unit.entityId, {
        throttle: 1,
        brake: 0,
        steer: Math.max(-1, Math.min(1, headingDiff * 3)),
      });
      return;
    }

    if (unit.path.length === 0 || unit.pathIndex >= unit.path.length) {
      unit.path = this.roadPathfinder.findPath(state.position, playerPos);
      unit.pathIndex = 0;
    }

    const waypoint = unit.path[unit.pathIndex];
    if (distance3(state.position, waypoint) < 5) {
      unit.pathIndex++;
    }

    const target = unit.path[unit.pathIndex] ?? playerPos;
    const dir = normalize3({
      x: target.x - state.position.x,
      y: 0,
      z: target.z - state.position.z,
    });
    const targetHeading = Math.atan2(dir.x, dir.z);
    const headingDiff = targetHeading - state.heading;

    this.vehicleControl.setAIInput(unit.entityId, {
      throttle: CHASE_SPEED_FACTOR,
      brake: 0,
      steer: Math.max(-1, Math.min(1, headingDiff * 2)),
    });
  }

  private spawnPoliceUnit(playerPos: Vec3): void {
    const angle = Math.random() * Math.PI * 2;
    const spawnPos = {
      x: playerPos.x + Math.cos(angle) * SPAWN_DISTANCE,
      y: playerPos.y,
      z: playerPos.z + Math.sin(angle) * SPAWN_DISTANCE,
    };
    const onRoad = this.roadPathfinder.getNearestPointOnRoad(spawnPos);
    const entityId = this.vehicleControl.spawnVehicle('police', onRoad.point);

    this.activePolice.set(entityId, {
      entityId,
      pathUpdateTimer: 0,
      path: [],
      pathIndex: 0,
    });
  }

  despawnAll(): void {
    for (const id of this.activePolice.keys()) {
      this.vehicleControl.despawnVehicle(id);
    }
    this.activePolice.clear();
  }

  getActiveCount(): number {
    return this.activePolice.size;
  }
}
