import type { Object3D } from 'three';
import type { IPhysicsService } from '../shared/services';
import type { Transform, Vec3 } from '../shared/types';

export interface BodyMeshSyncBridge {
  bind(bodyId: number, mesh: Object3D, body?: unknown, offset?: Vec3): void;
  unbind(bodyId: number): void;
}

export interface PlayerPhysicsService extends IPhysicsService {
  setBodyVelocity?(bodyId: number, velocity: Vec3): void;
  getBodyVelocity?(bodyId: number): Vec3;
  setBodyEnabled?(bodyId: number, enabled: boolean): void;
  getCannonBody?(bodyId: number): unknown;
  getBodyMeshSync?(): BodyMeshSyncBridge;
}

export function asPlayerPhysics(physics: IPhysicsService): PlayerPhysicsService {
  return physics as PlayerPhysicsService;
}

export function setBodyVelocity(
  physics: PlayerPhysicsService,
  bodyId: number,
  velocity: Vec3,
): void {
  if (physics.setBodyVelocity) {
    physics.setBodyVelocity(bodyId, velocity);
    return;
  }

  const transform = physics.getBodyTransform(bodyId);
  const next: Transform = {
    position: {
      x: transform.position.x + velocity.x * 0.016,
      y: transform.position.y + velocity.y * 0.016,
      z: transform.position.z + velocity.z * 0.016,
    },
    rotation: transform.rotation,
    scale: transform.scale,
  };
  physics.setBodyTransform(bodyId, next);
}
