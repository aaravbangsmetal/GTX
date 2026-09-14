import type { EventBus } from '../shared/events';
import type { EntityId, IAssetLoader } from '../shared/types';
import type { IRendererService } from '../shared/services';
import { quatFromHeading } from './helpers';
import type { VehiclePhysicsService } from './physics-service';
import { VehicleDamage } from './VehicleDamage';
import { VehicleModel } from './VehicleModel';
import { VehiclePhysics } from './VehiclePhysics';
import { VehicleState, type VehicleSnapshot, type VehicleTypeConfig } from './types';

export class Vehicle {
  readonly entityId: EntityId;
  readonly config: VehicleTypeConfig;
  readonly physics: VehiclePhysics;
  readonly model: VehicleModel;
  readonly damage: VehicleDamage;

  state: VehicleState;
  driverId: EntityId | null = null;

  constructor(
    entityId: EntityId,
    config: VehicleTypeConfig,
    physics: VehiclePhysicsService,
    events: EventBus,
  ) {
    this.entityId = entityId;
    this.config = config;
    this.state = VehicleState.PARKED;
    this.physics = new VehiclePhysics(physics, config);
    this.model = new VehicleModel();
    this.damage = new VehicleDamage(this.model);

    this.damage.setOnDestroyed(() => {
      this.destroy(events);
    });
  }

  async init(
    position: { x: number; y: number; z: number },
    heading: number,
    assets: IAssetLoader,
    renderer: IRendererService,
  ): Promise<void> {
    this.physics.init(position, quatFromHeading(heading));
    await this.model.load(this.config, assets);
    renderer.addToScene(this.model.getMesh(), 1);
    this.syncVisuals();
  }

  getSnapshot(): VehicleSnapshot {
    const pos = this.physics.getPosition();
    const speed = this.physics.getSpeed();
    return {
      entityId: this.entityId,
      type: this.config.id,
      state: this.state,
      position: pos,
      speed,
      speedKmh: speed * 3.6,
      health: this.damage.getHealth(),
      driverId: this.driverId,
      heading: this.physics.getHeading(),
    };
  }

  setDriver(playerId: EntityId | null): void {
    this.driverId = playerId;
  }

  syncVisuals(): void {
    const pos = this.physics.getPosition();
    this.model.syncTransform(pos, this.physics.getHeading());
  }

  destroy(events: EventBus): void {
    if (this.state === VehicleState.DESTROYED) return;
    this.state = VehicleState.DESTROYED;
    events.emit('vehicle:destroy', { vehicleId: this.entityId });
  }

  dispose(renderer: IRendererService): void {
    renderer.removeFromScene(this.model.getMesh());
    this.model.dispose();
    this.physics.dispose();
  }
}
