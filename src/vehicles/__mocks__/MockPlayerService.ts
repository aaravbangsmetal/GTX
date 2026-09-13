import type { IPlayerService } from '../../shared/services';
import { PLAYER_SPAWN } from '../../shared/constants';
import type { EntityId, PlayerStateSnapshot, Vec3 } from '../../shared/types';

export class MockPlayerService implements IPlayerService {
  private entityId: EntityId = 1;
  private position: Vec3 = { ...PLAYER_SPAWN };
  private inVehicle = false;
  private vehicleId: EntityId | null = null;
  private controllable = true;

  getState(): PlayerStateSnapshot {
    return {
      health: 100,
      armor: 0,
      money: 0,
      wantedLevel: 0,
      weaponId: null,
      position: { ...this.position },
      isInVehicle: this.inVehicle,
      vehicleId: this.vehicleId,
    };
  }

  getEntityId(): EntityId {
    return this.entityId;
  }

  getPosition(): Vec3 {
    return { ...this.position };
  }

  isControllable(): boolean {
    return this.controllable;
  }

  teleport(position: Vec3): void {
    this.position = { ...position };
  }

  setInVehicle(vehicleId: EntityId | null): void {
    this.inVehicle = vehicleId !== null;
    this.vehicleId = vehicleId;
    this.controllable = vehicleId === null;
  }
}
