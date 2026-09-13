import type { EventBus } from '../shared/events';
import type { EntityId, Vec3 } from '../shared/types';
import type { IPhysicsService } from '../shared/services';
import { COMBAT_RAYCAST_MASK } from './collision';
import type { GameplayPlayerBridge } from './player-bridge';
import type { WeaponManager } from './WeaponManager';
import type { WeaponConfig } from './types';

export class CombatSystem {
  private unsubShoot: (() => void) | null = null;
  private playerEntityId: EntityId = 0;
  private playerBridge: GameplayPlayerBridge | null = null;

  constructor(
    private weapons: WeaponManager,
    private physics: IPhysicsService,
    private events: EventBus,
  ) {}

  setPlayerBridge(bridge: GameplayPlayerBridge): void {
    this.playerBridge = bridge;
  }

  init(): void {
    const handler = (payload: { origin: Vec3; direction: Vec3; weaponId: string }) => {
      const weapon = this.weapons.getCurrentWeapon();
      if (weapon.id !== payload.weaponId) return;
      this.processShot(payload.origin, payload.direction, weapon);
    };
    this.events.on('combat:shoot', handler);
    this.unsubShoot = () => this.events.off('combat:shoot', handler);

    this.events.on('player:spawn', ({ entityId }) => {
      this.playerEntityId = entityId;
    });
  }

  dispose(): void {
    this.unsubShoot?.();
    this.unsubShoot = null;
  }

  processShot(origin: Vec3, direction: Vec3, weapon: WeaponConfig): void {
    const hit = this.physics.raycast(origin, direction, weapon.range, COMBAT_RAYCAST_MASK);
    if (!hit) return;

    this.events.emit('combat:hit', {
      targetId: hit.entityId,
      damage: weapon.damage,
      position: { ...hit.point },
    });

    this.applyDamage(hit.entityId, weapon.damage, this.playerEntityId);
  }

  applyDamage(targetId: EntityId, damage: number, sourceId: EntityId): void {
    if (targetId !== this.playerEntityId || sourceId === targetId) return;
    this.playerBridge?.applyDamage(damage);
  }

  update(_dt: number): void {
    this.weapons.updateReload();
  }
}
