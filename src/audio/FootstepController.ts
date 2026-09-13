import type { EventBus } from '../shared/events';
import type { SFXLibrary } from './SFXLibrary';
import type { FootstepSurface } from './types';

export class FootstepController {
  private stepTimer = 0;
  private readonly walkInterval = 0.4;
  private readonly runInterval = 0.25;
  private readonly runSpeedThreshold = 4;

  constructor(private readonly sfx: SFXLibrary) {}

  bindEvents(events: EventBus): void {
    events.on('player:move', (payload) => {
      this.onPlayerMove(payload);
    });
  }

  update(dt: number): void {
    if (this.stepTimer > 0) {
      this.stepTimer -= dt;
    }
  }

  private onPlayerMove(payload: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    isGrounded: boolean;
  }): void {
    if (!payload.isGrounded) return;

    const speed = Math.hypot(payload.velocity.x, payload.velocity.z);
    if (speed < 0.5) return;

    const interval = speed >= this.runSpeedThreshold ? this.runInterval : this.walkInterval;
    if (this.stepTimer > 0) return;

    this.stepTimer = interval;
    const surface = this.detectSurface(payload.position);
    this.sfx.playFootstep(surface);
  }

  private detectSurface(_position: { x: number; y: number; z: number }): FootstepSurface {
    // Default to concrete until physics material raycasts are wired by Agent 4/5.
    return 'concrete';
  }
}
