import type { EventBus } from '../shared/events';
import { normalize3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import type { WeaponConfig } from './types';
import { DEFAULT_WEAPON_ID, WEAPONS } from './weapons';

export class WeaponManager {
  private currentWeapon = DEFAULT_WEAPON_ID;
  private reserveAmmo: Record<string, number> = { pistol: 0, smg: 0 };
  private clipAmmo: Record<string, number> = {};
  private lastFireTime = 0;
  private isReloading = false;
  private reloadTimer = 0;

  constructor(private events?: EventBus) {}

  getCurrentWeapon(): WeaponConfig {
    return WEAPONS[this.currentWeapon] ?? WEAPONS.fists;
  }

  getCurrentWeaponId(): string {
    return this.currentWeapon;
  }

  isReloadingWeapon(): boolean {
    return this.isReloading;
  }

  getAmmo(weaponId: string): number {
    if (weaponId === 'fists') return 0;
    return (this.clipAmmo[weaponId] ?? 0) + (this.reserveAmmo[weaponId] ?? 0);
  }

  getClipAmmo(weaponId: string): number {
    return this.clipAmmo[weaponId] ?? 0;
  }

  getReserveAmmo(weaponId: string): number {
    return this.reserveAmmo[weaponId] ?? 0;
  }

  getAllAmmo(): Record<string, number> {
    return {
      pistol: this.getAmmo('pistol'),
      smg: this.getAmmo('smg'),
    };
  }

  switchWeapon(weaponId: string): boolean {
    if (!WEAPONS[weaponId]) return false;
    if (this.isReloading) return false;
    this.currentWeapon = weaponId;
    return true;
  }

  canFire(now = performance.now() / 1000): boolean {
    if (this.isReloading) return false;
    const weapon = this.getCurrentWeapon();
    const cooldown = 1 / weapon.fireRate;
    if (now - this.lastFireTime < cooldown) return false;
    if (weapon.magazineSize > 0 && (this.clipAmmo[weapon.id] ?? 0) <= 0) return false;
    return true;
  }

  fire(origin: Vec3, direction: Vec3, now = performance.now() / 1000): boolean {
    if (!this.canFire(now)) return false;

    const weapon = this.getCurrentWeapon();
    this.lastFireTime = now;

    if (weapon.magazineSize > 0) {
      const clip = this.clipAmmo[weapon.id] ?? 0;
      if (clip <= 0) return false;
      this.clipAmmo[weapon.id] = clip - 1;
    }

    const spreadDir = this.applySpread(direction, weapon.spread);
    this.events?.emit('combat:shoot', {
      origin: { ...origin },
      direction: spreadDir,
      weaponId: weapon.id,
    });

    return true;
  }

  reload(now = performance.now() / 1000): void {
    const weapon = this.getCurrentWeapon();
    if (weapon.magazineSize <= 0 || this.isReloading) return;

    const clip = this.clipAmmo[weapon.id] ?? 0;
    const reserve = this.reserveAmmo[weapon.id] ?? 0;
    if (clip >= weapon.magazineSize || reserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = now + weapon.reloadTime;
  }

  updateReload(now = performance.now() / 1000): void {
    if (!this.isReloading) return;
    if (now < this.reloadTimer) return;

    const weapon = this.getCurrentWeapon();
    const needed = weapon.magazineSize - (this.clipAmmo[weapon.id] ?? 0);
    const available = this.reserveAmmo[weapon.id] ?? 0;
    const transfer = Math.min(needed, available);

    this.clipAmmo[weapon.id] = (this.clipAmmo[weapon.id] ?? 0) + transfer;
    this.reserveAmmo[weapon.id] = available - transfer;
    this.isReloading = false;
  }

  addAmmo(weaponId: string, amount: number): void {
    if (amount <= 0 || weaponId === 'fists') return;
    this.reserveAmmo[weaponId] = (this.reserveAmmo[weaponId] ?? 0) + amount;
  }

  giveWeapon(weaponId: string, ammo: number): void {
    if (!WEAPONS[weaponId]) return;
    this.currentWeapon = weaponId;

    if (weaponId === 'fists' || ammo <= 0) return;

    const weapon = WEAPONS[weaponId];
    const toClip = Math.min(ammo, weapon.magazineSize);
    this.clipAmmo[weaponId] = toClip;
    this.reserveAmmo[weaponId] = Math.max(0, ammo - toClip);
  }

  restoreAmmo(ammo: Record<string, number>, weaponId: string | null): void {
    this.clipAmmo = {};
    this.reserveAmmo = { pistol: 0, smg: 0 };
    for (const [id, amount] of Object.entries(ammo)) {
      if (id === 'fists') continue;
      const weapon = WEAPONS[id];
      if (!weapon) continue;
      const toClip = Math.min(amount, weapon.magazineSize);
      this.clipAmmo[id] = toClip;
      this.reserveAmmo[id] = Math.max(0, amount - toClip);
    }
    this.currentWeapon = weaponId && WEAPONS[weaponId] ? weaponId : DEFAULT_WEAPON_ID;
  }

  private applySpread(direction: Vec3, spread: number): Vec3 {
    if (spread <= 0) return normalize3(direction);

    const base = normalize3(direction);
    const yaw = (Math.random() - 0.5) * spread * 2;
    const pitch = (Math.random() - 0.5) * spread * 2;
    const cosPitch = Math.cos(pitch);
    return normalize3({
      x: base.x * Math.cos(yaw) * cosPitch + base.z * Math.sin(yaw),
      y: base.y + Math.sin(pitch),
      z: base.z * Math.cos(yaw) - base.x * Math.sin(yaw),
    });
  }
}
