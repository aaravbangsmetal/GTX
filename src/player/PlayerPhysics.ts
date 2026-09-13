import { vec3 } from '../shared/math';
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

  checkGrounded(): boolean {
    if (this.bodyId < 0) {
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
}
