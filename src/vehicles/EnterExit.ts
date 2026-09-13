import { VEHICLE_ENTER_RADIUS } from '../shared/constants';
import { distance3 } from '../shared/math';
import type { EventBus } from '../shared/events';
import type { EntityId, Vec3 } from '../shared/types';
import { rotateVecByQuat } from './helpers';
import type { Vehicle } from './Vehicle';
import { VehicleState } from './types';

export class EnterExit {
  constructor(
    private vehicles: Map<EntityId, Vehicle>,
    private events: EventBus,
  ) {}

  tryEnter(playerId: EntityId, playerPos: Vec3): boolean {
    let nearest: Vehicle | null = null;
    let nearestDist = VEHICLE_ENTER_RADIUS;

    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state === VehicleState.DESTROYED) continue;
      if (vehicle.state !== VehicleState.PARKED && vehicle.state !== VehicleState.AI_CONTROLLED) {
        continue;
      }
      const vPos = vehicle.physics.getPosition();
      const dist = distance3(playerPos, vPos);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = vehicle;
      }
    }

    if (!nearest) return false;

    nearest.setDriver(playerId);
    nearest.state = VehicleState.DRIVEN;
    this.events.emit('player:enterVehicle', {
      playerId,
      vehicleId: nearest.entityId,
      seat: 'driver',
    });
    return true;
  }

  exit(playerId: EntityId, vehicleId: EntityId): Vec3 | null {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.driverId !== playerId) return null;

    const exitPos = this.calculateExitPosition(vehicle);
    vehicle.setDriver(null);
    vehicle.state = VehicleState.PARKED;

    this.events.emit('player:exitVehicle', {
      playerId,
      vehicleId,
      position: exitPos,
    });
    return exitPos;
  }

  calculateExitPosition(vehicle: Vehicle): Vec3 {
    const pos = vehicle.physics.getPosition();
    const rot = vehicle.physics.getRotation();
    const right = rotateVecByQuat({ x: 1, y: 0, z: 0 }, rot);
    const offset = 2;

    return {
      x: pos.x + right.x * offset,
      y: pos.y + 0.5,
      z: pos.z + right.z * offset,
    };
  }

  findNearestVehicle(playerPos: Vec3): EntityId | null {
    let nearestId: EntityId | null = null;
    let nearestDist = VEHICLE_ENTER_RADIUS;

    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state === VehicleState.DESTROYED) continue;
      const dist = distance3(playerPos, vehicle.physics.getPosition());
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = vehicle.entityId;
      }
    }
    return nearestId;
  }
}
