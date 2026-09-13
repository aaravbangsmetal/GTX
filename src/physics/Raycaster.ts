import * as CANNON from 'cannon-es';
import type { EntityId, RaycastHit } from '../shared/types';
import { normalize3 } from '../shared/math';
import type { RaycastOptions } from './types';

export class PhysicsRaycaster {
  private readonly result = new CANNON.RaycastResult();

  constructor(
    private readonly world: CANNON.World,
    private readonly bodyEntityMap: ReadonlyMap<number, EntityId>,
    private readonly cannonToBodyId: Map<number, number>,
  ) {}

  cast(options: RaycastOptions): RaycastHit | null {
    const direction = normalize3(options.direction);
    if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
      return null;
    }

    const from = new CANNON.Vec3(options.origin.x, options.origin.y, options.origin.z);
    const to = new CANNON.Vec3(
      from.x + direction.x * options.maxDistance,
      from.y + direction.y * options.maxDistance,
      from.z + direction.z * options.maxDistance,
    );

    this.result.reset();
    const hit = this.world.raycastClosest(from, to, {
      collisionFilterMask: options.collisionMask ?? ~0,
      skipBackfaces: true,
    }, this.result);

    if (!hit || !this.result.hasHit || !this.result.body) {
      return null;
    }

    const bodyId = this.cannonToBodyId.get(this.result.body.id);
    if (bodyId === undefined) return null;
    if (options.skipBodyId !== undefined && bodyId === options.skipBodyId) {
      return null;
    }

    return this.toHit(bodyId, this.result);
  }

  private toHit(bodyId: number, result: CANNON.RaycastResult): RaycastHit {
    return {
      bodyId,
      entityId: this.bodyEntityMap.get(bodyId) ?? 0,
      point: {
        x: result.hitPointWorld.x,
        y: result.hitPointWorld.y,
        z: result.hitPointWorld.z,
      },
      normal: {
        x: result.hitNormalWorld.x,
        y: result.hitNormalWorld.y,
        z: result.hitNormalWorld.z,
      },
      distance: result.distance,
    };
  }
}
