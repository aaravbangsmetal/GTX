import { MAX_DELTA_TIME, PHYSICS_TICK_RATE } from '../shared/constants';
import type { EventBus } from '../shared/events';
import type { SystemRegistry } from './SystemRegistry';

export interface GameLoopCallbacks {
  onTick?: (delta: number, elapsed: number, fixedDelta: number) => void;
}

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private elapsed = 0;
  private accumulator = 0;
  private rafId = 0;
  private readonly fixedDelta = 1 / PHYSICS_TICK_RATE;

  constructor(
    private registry: SystemRegistry,
    private events: EventBus,
    private callbacks: GameLoopCallbacks = {},
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  getElapsed(): number {
    return this.elapsed;
  }

  private frame = (now: number): void => {
    if (!this.running) return;

    const delta = Math.min((now - this.lastTime) / 1000, MAX_DELTA_TIME);
    this.lastTime = now;
    this.elapsed += delta;
    this.accumulator += delta;

    const fixedSystems = this.registry.getFixedUpdateSystems();
    while (this.accumulator >= this.fixedDelta) {
      for (const system of fixedSystems) {
        system.fixedUpdate(this.fixedDelta);
      }
      this.accumulator -= this.fixedDelta;
    }

    const variableSystems = this.registry.getVariableUpdateSystems();
    for (const system of variableSystems) {
      system.update(delta);
    }

    this.callbacks.onTick?.(delta, this.elapsed, this.fixedDelta);
    this.events.emit('game:tick', { delta, elapsed: this.elapsed, fixedDelta: this.fixedDelta });

    this.rafId = requestAnimationFrame(this.frame);
  };
}
