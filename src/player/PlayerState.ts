import type { EventBus } from '../shared/events';
import { vec3 } from '../shared/math';
import type { EntityId, PlayerStateSnapshot, Vec3 } from '../shared/types';
import type { PlayerConfig } from './types';
import { PlayerMode } from './types';

export class PlayerStateManager {
  private health: number;
  private armor = 0;
  private money = 0;
  private wantedLevel = 0;
  private weaponId: string | null = null;
  private mode: PlayerMode = PlayerMode.ON_FOOT;
  private vehicleId: EntityId | null = null;
  private position: Vec3 = vec3();

  constructor(
    private config: PlayerConfig,
    private events: EventBus,
  ) {
    this.health = config.maxHealth;
  }

  getSnapshot(): PlayerStateSnapshot {
    return {
      health: this.health,
      armor: this.armor,
      money: this.money,
      wantedLevel: this.wantedLevel,
      weaponId: this.weaponId,
      position: { ...this.position },
      isInVehicle: this.mode !== PlayerMode.ON_FOOT,
      vehicleId: this.vehicleId,
    };
  }

  setPosition(pos: Vec3): void {
    this.position = { ...pos };
  }

  setHealth(value: number): void {
    const clamped = Math.max(0, Math.min(this.config.maxHealth, value));
    if (clamped === this.health) return;
    this.health = clamped;
    this.emitChange();
  }

  setArmor(value: number): void {
    const clamped = Math.max(0, Math.min(this.config.maxArmor, value));
    if (clamped === this.armor) return;
    this.armor = clamped;
    this.emitChange();
  }

  addMoney(amount: number): void {
    this.money += amount;
    this.emitChange();
  }

  setWantedLevel(level: number): void {
    const clamped = Math.max(0, Math.min(5, level));
    if (clamped === this.wantedLevel) return;
    this.wantedLevel = clamped;
    this.emitChange();
  }

  setWeapon(id: string | null): void {
    if (id === this.weaponId) return;
    this.weaponId = id;
    this.emitChange();
  }

  setMode(mode: PlayerMode, vehicleId?: EntityId): void {
    if (mode === this.mode && vehicleId === this.vehicleId) return;
    this.mode = mode;
    this.vehicleId = vehicleId ?? null;
    this.emitChange();
  }

  getMode(): PlayerMode {
    return this.mode;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  private emitChange(): void {
    this.events.emit('player:stateChange', { state: this.getSnapshot() });
  }
}
