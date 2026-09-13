import { vec3 } from '../../shared/math';
import type { BodyConfig, RaycastHit, Transform, Vec3 } from '../../shared/types';
import type { IPhysicsService } from '../../shared/services';

export class MockPhysicsService implements IPhysicsService {
  private bodies = new Map<number, Transform>();
  private nextBodyId = 1;

  createBody(config: BodyConfig): number {
    const id = this.nextBodyId++;
    this.bodies.set(id, {
      position: { ...config.position },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: vec3(1, 1, 1),
    });
    return id;
  }

  removeBody(bodyId: number): void {
    this.bodies.delete(bodyId);
  }

  raycast(_origin: Vec3, _direction: Vec3, _maxDist: number): RaycastHit | null {
    return null;
  }

  getBodyTransform(bodyId: number): Transform {
    return this.bodies.get(bodyId) ?? {
      position: vec3(),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: vec3(1, 1, 1),
    };
  }

  setBodyTransform(bodyId: number, transform: Transform): void {
    this.bodies.set(bodyId, transform);
  }
}
