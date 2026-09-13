import type { EventBus } from '../shared/events';
import { normalize3, vec3 } from '../shared/math';
import type { EntityId } from '../shared/types';
import { InputManager } from './InputManager';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerPhysics } from './PlayerPhysics';
import { PlayerStateManager } from './PlayerState';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { addVec3, lengthVec3, subVec3 } from './vec3-utils';
import type { PlayerConfig } from './types';
import { PlayerMode } from './types';

export class PlayerController {
  constructor(
    private input: InputManager,
    private physics: PlayerPhysics,
    private camera: ThirdPersonCamera,
    private animator: PlayerAnimator,
    private state: PlayerStateManager,
    private config: PlayerConfig,
    private events: EventBus,
    private entityId: EntityId,
  ) {}

  update(dt: number): void {
    if (this.state.getMode() !== PlayerMode.ON_FOOT) return;

    const input = this.input.update();
    const pos = this.physics.getPosition();
    const yaw = this.camera.getYaw();

    const forward = vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = vec3(Math.cos(yaw), 0, -Math.sin(yaw));

    let moveDir = vec3();
    if (input.forward) moveDir = addVec3(moveDir, forward);
    if (input.backward) moveDir = subVec3(moveDir, forward);
    if (input.left) moveDir = subVec3(moveDir, right);
    if (input.right) moveDir = addVec3(moveDir, right);
    moveDir = normalize3(moveDir);

    const moving = lengthVec3(moveDir) > 0;
    const speed = input.sprint
      ? this.config.sprintSpeed
      : moving
        ? this.config.runSpeed
        : 0;

    this.physics.applyMovement(moveDir, speed, dt);

    if (input.jump) {
      this.physics.jump();
    }

    const grounded = this.physics.checkGrounded();
    const velocity = this.physics.getVelocity();

    this.camera.update(pos, input, dt);
    this.animator.update(dt, speed, grounded, velocity.y);

    this.state.setPosition(pos);
    this.events.emit('player:move', {
      position: { ...pos },
      velocity: { ...velocity },
      isGrounded: grounded,
    });
  }
}
