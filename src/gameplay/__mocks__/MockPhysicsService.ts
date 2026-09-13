import { vec3 } from '../../shared/math';
import type { BodyConfig, RaycastHit, Transform, Vec3 } from '../../shared/types';
import type { IPhysicsService } from '../../shared/services';
import { CollisionGroup } from '../collision';

interface MockBody {
  config: BodyConfig;
  entityId: number;
}

let nextBodyId = 1;
let nextEntityId = 5000;

const registeredTargets: MockBody[] = [];

export function createMockPhysicsService(): IPhysicsService {
  const bodies = new Map<number, MockBody>();

  return {
    createBody(config: BodyConfig): number {
      const bodyId = nextBodyId++;
      const entityId = nextEntityId++;
      const body: MockBody = {
        config: {
          ...config,
          position: { ...config.position },
          dimensions: { ...config.dimensions },
        },
        entityId,
      };
      bodies.set(bodyId, body);
      if ((config.collisionGroup & CollisionGroup.NPC) !== 0 ||
          (config.collisionGroup & CollisionGroup.PLAYER) !== 0) {
        registeredTargets.push(body);
      }
      return bodyId;
    },

    removeBody(bodyId: number): void {
      const body = bodies.get(bodyId);
      if (body) {
        const idx = registeredTargets.indexOf(body);
        if (idx >= 0) registeredTargets.splice(idx, 1);
      }
      bodies.delete(bodyId);
    },

    raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null {
      const dirLen = Math.hypot(direction.x, direction.y, direction.z);
      if (dirLen === 0) return null;
      const norm = {
        x: direction.x / dirLen,
        y: direction.y / dirLen,
        z: direction.z / dirLen,
      };

      let closest: RaycastHit | null = null;

      for (const body of registeredTargets) {
        const group = body.config.collisionGroup;
        if (mask !== undefined && (mask & group) === 0) continue;

        const center = body.config.position;
        const radius = Math.max(body.config.dimensions.x, body.config.dimensions.z) * 0.5;
        const oc = {
          x: origin.x - center.x,
          y: origin.y - center.y,
          z: origin.z - center.z,
        };

        const b = 2 * (oc.x * norm.x + oc.y * norm.y + oc.z * norm.z);
        const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
        const discriminant = b * b - 4 * c;
        if (discriminant < 0) continue;

        const t = (-b - Math.sqrt(discriminant)) / 2;
        if (t < 0 || t > maxDist) continue;

        const hit: RaycastHit = {
          bodyId: 0,
          entityId: body.entityId,
          point: {
            x: origin.x + norm.x * t,
            y: origin.y + norm.y * t,
            z: origin.z + norm.z * t,
          },
          normal: vec3(0, 1, 0),
          distance: t,
        };

        if (!closest || t < closest.distance) {
          closest = hit;
        }
      }

      return closest;
    },

    getBodyTransform(bodyId: number): Transform {
      const body = bodies.get(bodyId);
      if (!body) {
        return {
          position: vec3(),
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: vec3(1, 1, 1),
        };
      }
      return {
        position: { ...body.config.position },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: vec3(1, 1, 1),
      };
    },

    setBodyTransform(bodyId: number, transform: Transform): void {
      const body = bodies.get(bodyId);
      if (!body) return;
      body.config.position = { ...transform.position };
    },
  };
}

export function registerMockTarget(position: Vec3, group: CollisionGroup): number {
  const service = createMockPhysicsService();
  return service.createBody({
    shape: 'sphere',
    dimensions: vec3(0.6, 1.8, 0.6),
    mass: 70,
    position,
    collisionGroup: group,
    collisionMask: 0xffff,
  });
}
