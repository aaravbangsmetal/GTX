import type { AiIntersection } from './types';

export type TrafficLightPhase = 'green' | 'yellow' | 'red';

export class TrafficLightManager {
  private cycleTime = 25;
  private elapsed = 0;
  private intersections = new Map<string, AiIntersection>();

  registerIntersections(intersections: AiIntersection[]): void {
    for (const inter of intersections) {
      if (inter.hasTrafficLight) {
        this.intersections.set(inter.id, inter);
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.cycleTime) {
      this.elapsed -= this.cycleTime;
    }
  }

  getPhase(): TrafficLightPhase {
    if (this.elapsed < 15) return 'green';
    if (this.elapsed < 18) return 'yellow';
    return 'red';
  }

  shouldStop(intersectionId: string): boolean {
    const inter = this.intersections.get(intersectionId);
    if (!inter) return false;

    const phase = this.getPhase();
    const isNS = inter.orientation === 'ns';

    if (isNS) {
      return phase === 'red' || phase === 'yellow';
    }
    return phase === 'green' || phase === 'yellow';
  }

  getCycleProgress(): number {
    return this.elapsed / this.cycleTime;
  }

  reset(): void {
    this.elapsed = 0;
  }
}
