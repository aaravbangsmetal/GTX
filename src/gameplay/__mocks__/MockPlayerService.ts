import { PLAYER_SPAWN } from '../../shared/constants';
import type { EntityId, PlayerStateSnapshot, Vec3 } from '../../shared/types';
import type { IPlayerService } from '../../shared/services';

export function createMockPlayerService(): IPlayerService & {
  setHealth: (value: number) => void;
  setArmor: (value: number) => void;
  addMoney: (amount: number) => void;
  setWantedLevel: (level: number) => void;
  setWeapon: (id: string | null) => void;
  applyDamage: (amount: number) => void;
  getSnapshot: () => PlayerStateSnapshot;
} {
  let entityId: EntityId = 1;
  const state: PlayerStateSnapshot = {
    health: 100,
    armor: 0,
    money: 0,
    wantedLevel: 0,
    weaponId: null,
    position: { ...PLAYER_SPAWN },
    isInVehicle: false,
    vehicleId: null,
  };

  return {
    getState: () => ({ ...state, position: { ...state.position } }),
    getSnapshot: () => ({ ...state, position: { ...state.position } }),
    getEntityId: () => entityId,
    getPosition: () => ({ ...state.position }),
    isControllable: () => state.health > 0 && !state.isInVehicle,
    teleport: (position: Vec3) => {
      state.position = { ...position };
    },
    setHealth: (value: number) => {
      state.health = Math.max(0, Math.min(100, value));
    },
    setArmor: (value: number) => {
      state.armor = Math.max(0, Math.min(100, value));
    },
    addMoney: (amount: number) => {
      state.money += amount;
    },
    setWantedLevel: (level: number) => {
      state.wantedLevel = Math.max(0, Math.min(5, level));
    },
    setWeapon: (id: string | null) => {
      state.weaponId = id;
    },
    applyDamage: (amount: number) => {
      let remaining = amount;
      if (state.armor > 0) {
        const absorbed = Math.min(state.armor, remaining);
        state.armor -= absorbed;
        remaining -= absorbed;
      }
      state.health = Math.max(0, state.health - remaining);
    },
  };
}
