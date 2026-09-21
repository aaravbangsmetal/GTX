import { clamp, vec3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import { CollisionGroup, PLAYER_COLLISION_MASK } from './collision';
import {
  asPlayerPhysics,
  setBodyVelocity,
  type PlayerPhysicsService,
} from './physics-bridge';
import type { PlayerConfig } from './types';

export class PlayerPhysics {
  private bodyId = -1;
  private grounded = false;
  private enabled = true;
  private readonly physics: PlayerPhysicsService;

  constructor(physics: PlayerPhysicsService, private config: PlayerConfig) {
    this.physics = asPlayerPhysics(physics);
  }

  init(position: Vec3): void {
    this.bodyId = this.physics.createBody({
      shape: 'capsule',
      dimensions: vec3(this.config.capsuleRadius, this.config.capsuleHeight, 0),
      mass: 80,
      position: { ...position },
      collisionGroup: CollisionGroup.PLAYER,
      collisionMask: PLAYER_COLLISION_MASK,
    });
  }

  getBodyId(): number {
    return this.bodyId;
  }

  applyMovement(direction: Vec3, speed: number, dt: number): void {
    if (!this.enabled || this.bodyId < 0) return;

    const velocity = this.physics.getBodyVelocity?.(this.bodyId) ?? vec3();
    const targetX = direction.x * speed;
    const targetZ = direction.z * speed;
    const rate = speed > 0 ? this.config.acceleration : this.config.deceleration;
    const step = rate * dt;

    setBodyVelocity(this.physics, this.bodyId, {
      x: moveToward(velocity.x, targetX, step),
      y: velocity.y,
      z: moveToward(velocity.z, targetZ, step),
    });
  }

  jump(): void {
    if (!this.enabled || !this.grounded || this.bodyId < 0) return;
    const velocity = this.physics.getBodyVelocity?.(this.bodyId) ?? vec3();
    setBodyVelocity(this.physics, this.bodyId, {
      x: velocity.x,
      y: this.config.jumpForce,
      z: velocity.z,
    });
    this.grounded = false;
  }

  checkGrounded(): boolean {
    if (!this.enabled || this.bodyId < 0) {
      this.grounded = false;
      return false;
    }

    const pos = this.getPosition();
    const hit = this.physics.raycast(pos, vec3(0, -1, 0), 1.1, CollisionGroup.STATIC);
    this.grounded = hit !== null;
    return this.grounded;
  }

  getPosition(): Vec3 {
    if (this.bodyId < 0) return vec3();
    return this.physics.getBodyTransform(this.bodyId).position;
  }

  getVelocity(): Vec3 {
    if (this.bodyId < 0) return vec3();
    return this.physics.getBodyVelocity?.(this.bodyId) ?? vec3();
  }

  teleport(position: Vec3): void {
    if (this.bodyId < 0) return;
    const transform = this.physics.getBodyTransform(this.bodyId);
    this.physics.setBodyTransform(this.bodyId, {
      ...transform,
      position: { ...position },
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.bodyId < 0) return;
    this.physics.setBodyEnabled?.(this.bodyId, enabled);
    if (!enabled) {
      setBodyVelocity(this.physics, this.bodyId, vec3());
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

function moveToward(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + clamp(delta, -maxDelta, maxDelta);
}
