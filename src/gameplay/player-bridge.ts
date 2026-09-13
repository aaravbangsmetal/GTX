import type { IPlayerService } from '../shared/services';
import type { EntityId, PlayerStateSnapshot, Vec3 } from '../shared/types';

export interface GameplayPlayerBridge extends IPlayerService {
  setHealth(value: number): void;
  setArmor(value: number): void;
  addMoney(amount: number): void;
  setWantedLevel(level: number): void;
  setWeapon(id: string | null): void;
  applyDamage(amount: number): void;
  getSnapshot(): PlayerStateSnapshot;
}

export function createGameplayPlayerBridge(
  player: IPlayerService,
  fallback?: Partial<GameplayPlayerBridge>,
): GameplayPlayerBridge {
  const extended = player as Partial<GameplayPlayerBridge>;

  return {
    getState: () => player.getState(),
    getEntityId: () => player.getEntityId(),
    getPosition: () => player.getPosition(),
    isControllable: () => player.isControllable(),
    teleport: (position: Vec3) => player.teleport(position),
    getSnapshot: () => extended.getSnapshot?.() ?? player.getState(),
    setHealth: (value) => {
      if (extended.setHealth) extended.setHealth(value);
      else fallback?.setHealth?.(value);
    },
    setArmor: (value) => {
      if (extended.setArmor) extended.setArmor(value);
      else fallback?.setArmor?.(value);
    },
    addMoney: (amount) => {
      if (extended.addMoney) extended.addMoney(amount);
      else fallback?.addMoney?.(amount);
    },
    setWantedLevel: (level) => {
      if (extended.setWantedLevel) extended.setWantedLevel(level);
      else fallback?.setWantedLevel?.(level);
    },
    setWeapon: (id) => {
      if (extended.setWeapon) extended.setWeapon(id);
      else fallback?.setWeapon?.(id);
    },
    applyDamage: (amount) => {
      if (extended.applyDamage) extended.applyDamage(amount);
      else fallback?.applyDamage?.(amount);
    },
  };
}

export function trackNpcType(
  npcTypes: Map<EntityId, string>,
  npcId: EntityId,
  type: string,
): void {
  npcTypes.set(npcId, type);
}

export function forgetNpcType(npcTypes: Map<EntityId, string>, npcId: EntityId): void {
  npcTypes.delete(npcId);
}

export function getNpcType(npcTypes: Map<EntityId, string>, npcId: EntityId): string | undefined {
  return npcTypes.get(npcId);
}
