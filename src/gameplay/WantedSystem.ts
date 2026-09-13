import { WANTED_MAX_LEVEL } from '../shared/constants';
import type { EventBus } from '../shared/events';
import type { Vec3 } from '../shared/types';

const BASE_DECAY_SECONDS = 30;

export class WantedSystem {
  private level = 0;
  private hiddenTimer = 0;
  private isHidden = true;

  constructor(private events: EventBus) {}

  getLevel(): number {
    return this.level;
  }

  setLevel(level: number): void {
    const clamped = Math.max(0, Math.min(WANTED_MAX_LEVEL, level));
    if (clamped === this.level) return;
    const previous = this.level;
    this.level = clamped;
    this.hiddenTimer = 0;
    this.events.emit('wanted:levelChange', { level: this.level, previousLevel: previous });
  }

  addStar(amount = 1): void {
    if (amount <= 0) return;
    this.isHidden = false;
    this.hiddenTimer = 0;
    this.setLevel(this.level + amount);
  }

  removeStar(): void {
    if (this.level <= 0) return;
    this.setLevel(this.level - 1);
    this.hiddenTimer = 0;
  }

  clear(): void {
    this.setLevel(0);
    this.hiddenTimer = 0;
  }

  markCrimeCommitted(): void {
    this.isHidden = false;
    this.hiddenTimer = 0;
  }

  update(dt: number, _playerPos: Vec3, policeCanSeePlayer = false): void {
    if (this.level <= 0) {
      this.hiddenTimer = 0;
      this.isHidden = true;
      return;
    }

    if (policeCanSeePlayer) {
      this.isHidden = false;
      this.hiddenTimer = 0;
      return;
    }

    this.isHidden = true;
    this.hiddenTimer += dt;

    const decayTime = this.getDecayTimeForLevel(this.level);
    if (this.hiddenTimer >= decayTime) {
      this.removeStar();
    }
  }

  getDecayTimeForLevel(level: number): number {
    if (level >= 4) return 60;
    if (level >= 3) return 45;
    return BASE_DECAY_SECONDS;
  }

  isPlayerHidden(): boolean {
    return this.isHidden;
  }
}
