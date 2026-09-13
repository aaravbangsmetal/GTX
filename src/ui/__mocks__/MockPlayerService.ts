import { PLAYER_SPAWN } from '../../shared/constants';
import type { IPlayerService } from '../../shared/services';
import type { EntityId, PlayerStateSnapshot, Vec3 } from '../../shared/types';

const DEFAULT_STATE: PlayerStateSnapshot = {
  health: 100,
  armor: 0,
  money: 0,
  wantedLevel: 0,
  weaponId: 'fists',
  position: { ...PLAYER_SPAWN },
  isInVehicle: false,
  vehicleId: null,
};

export const mockPlayerService: IPlayerService = {
  getState(): PlayerStateSnapshot {
    return { ...DEFAULT_STATE };
  },
  getEntityId(): EntityId {
    return 1;
  },
  getPosition(): Vec3 {
    return { ...DEFAULT_STATE.position };
  },
  isControllable(): boolean {
    return true;
  },
  teleport(position: Vec3): void {
    DEFAULT_STATE.position = { ...position };
  },
};
