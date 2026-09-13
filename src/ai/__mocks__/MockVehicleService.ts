import type { EntityId, Vec3 } from '../../shared/types';
import type { AIVehicleState, IVehicleAIControl, VehicleAIInput } from '../types';

export class MockVehicleService implements IVehicleAIControl {
  private vehicles = new Map<EntityId, AIVehicleState & { input: VehicleAIInput }>();
  private nextId = 20000;

  getState(entityId: EntityId): AIVehicleState | null {
    const v = this.vehicles.get(entityId);
    if (!v) return null;
    return {
      entityId: v.entityId,
      type: v.type,
      position: v.position,
      heading: v.heading,
      speedKmh: v.speedKmh,
      health: v.health,
    };
  }

  setAIInput(entityId: EntityId, input: VehicleAIInput): void {
    const v = this.vehicles.get(entityId);
    if (!v) return;
    v.input = input;

    const speedDelta = (input.throttle - input.brake * 0.5) * 2;
    v.speedKmh = Math.max(0, v.speedKmh + speedDelta);
    v.heading += input.steer * 0.05;

    const speedMs = v.speedKmh / 3.6;
    v.position.x += Math.sin(v.heading) * speedMs * 0.016;
    v.position.z += Math.cos(v.heading) * speedMs * 0.016;
  }

  spawnVehicle(type: string, position: Vec3): EntityId {
    const entityId = this.nextId++;
    this.vehicles.set(entityId, {
      entityId,
      type,
      position: { ...position },
      heading: 0,
      speedKmh: 0,
      health: 100,
      input: { throttle: 0, brake: 0, steer: 0 },
    });
    return entityId;
  }

  despawnVehicle(entityId: EntityId): void {
    this.vehicles.delete(entityId);
  }

  getNearbyVehicles(position: Vec3, radius: number): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, v] of this.vehicles) {
      const dx = v.position.x - position.x;
      const dz = v.position.z - position.z;
      if (Math.hypot(dx, dz) <= radius) {
        result.push(id);
      }
    }
    return result;
  }
}
