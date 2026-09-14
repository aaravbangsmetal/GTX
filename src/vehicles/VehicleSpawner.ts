import type { EventBus } from '../shared/events';
import type { EntityId, GameContext, Vec3 } from '../shared/types';
import type { IRendererService } from '../shared/services';
import type { VehiclePhysicsService } from './physics-service';
import { Vehicle } from './Vehicle';
import { getVehicleType } from './VehicleTypes';
import type { VehicleTypeId } from './types';

export interface SpawnConfig {
  type: VehicleTypeId;
  position: Vec3;
  heading: number;
}

const OCEAN_BEACH_PARKING: SpawnConfig[] = [
  { type: 'sedan', position: { x: 195, y: 1.5, z: -145 }, heading: 0 },
  { type: 'sedan', position: { x: 205, y: 1.5, z: -145 }, heading: 0 },
  { type: 'sportscar', position: { x: 210, y: 1.5, z: -155 }, heading: Math.PI / 2 },
  { type: 'motorcycle', position: { x: 190, y: 1.2, z: -155 }, heading: -Math.PI / 4 },
  { type: 'truck', position: { x: 215, y: 2, z: -140 }, heading: Math.PI },
  { type: 'police', position: { x: 185, y: 1.5, z: -140 }, heading: Math.PI / 2 },
  { type: 'sedan', position: { x: 200, y: 1.5, z: -160 }, heading: 0 },
  { type: 'sportscar', position: { x: 208, y: 1.5, z: -150 }, heading: -Math.PI / 2 },
];

export class VehicleSpawner {
  constructor(
    private vehicles: Map<EntityId, Vehicle>,
    private ctx: GameContext,
    private physics: VehiclePhysicsService,
    private renderer: IRendererService,
    private events: EventBus,
  ) {}

  spawnSync(type: VehicleTypeId, position: Vec3, heading = 0): EntityId {
    const entityId = this.ctx.entities.createEntity();
    void this.spawnAsync(entityId, type, position, heading);
    return entityId;
  }

  async spawn(type: VehicleTypeId, position: Vec3, heading = 0): Promise<EntityId> {
    const entityId = this.ctx.entities.createEntity();
    await this.spawnAsync(entityId, type, position, heading);
    return entityId;
  }

  private async spawnAsync(
    entityId: EntityId,
    type: VehicleTypeId,
    position: Vec3,
    heading: number,
  ): Promise<void> {
    const config = getVehicleType(type);
    const vehicle = new Vehicle(entityId, config, this.physics, this.events);
    await vehicle.init(position, heading, this.ctx.assets, this.renderer);
    this.vehicles.set(entityId, vehicle);

    this.events.emit('vehicle:spawn', {
      vehicleId: entityId,
      type,
      position,
    });
  }

  despawn(entityId: EntityId): void {
    const vehicle = this.vehicles.get(entityId);
    if (!vehicle) return;
    vehicle.dispose(this.renderer);
    this.vehicles.delete(entityId);
    this.ctx.entities.destroyEntity(entityId);
    this.events.emit('vehicle:destroy', { vehicleId: entityId });
  }

  async spawnInitialVehicles(): Promise<void> {
    for (const cfg of OCEAN_BEACH_PARKING) {
      await this.spawn(cfg.type, cfg.position, cfg.heading);
    }
  }
}
