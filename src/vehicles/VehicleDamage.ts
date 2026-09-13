import type { Vec3 } from '../shared/types';
import type { VehicleModel } from './VehicleModel';

export class VehicleDamage {
  private health = 100;
  private onDestroyed: (() => void) | null = null;

  constructor(private model: VehicleModel) {}

  setOnDestroyed(callback: () => void): void {
    this.onDestroyed = callback;
  }

  takeDamage(amount: number, _point: Vec3): void {
    if (this.health <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.updateVisuals();

    if (this.health <= 0) {
      this.onDestroyed?.();
    }
  }

  getHealth(): number {
    return this.health;
  }

  repair(amount: number): void {
    this.health = Math.min(100, this.health + amount);
    this.updateVisuals();
  }

  private updateVisuals(): void {
    if (this.health > 75) {
      this.model.setDamageLevel(0);
    } else if (this.health > 50) {
      this.model.setDamageLevel(1);
    } else if (this.health > 25) {
      this.model.setDamageLevel(2);
    } else if (this.health > 0) {
      this.model.setDamageLevel(3);
    }
  }
}
