import type { Object3D } from 'three';
import { vec3 } from '../../shared/math';
import type { BodyConfig, RaycastHit, Transform, Vec3 } from '../../shared/types';
import type { BodyMeshSyncBridge, PlayerPhysicsService } from '../physics-bridge';
import { CollisionGroup, STATIC_COLLISION_MASK } from '../collision';

interface MockBody {
  config: BodyConfig;
  velocity: Vec3;
  enabled: boolean;
}

class MockBodyMeshSync implements BodyMeshSyncBridge {
  private readonly pairs = new Map<number, Object3D>();

  bind(bodyId: number, mesh: Object3D): void {
    this.pairs.set(bodyId, mesh);
  }

  unbind(bodyId: number): void {
    this.pairs.delete(bodyId);
  }

  sync(bodies: Map<number, MockBody>): void {
    for (const [bodyId, mesh] of this.pairs) {
      const body = bodies.get(bodyId);
      if (!body || !body.enabled) continue;
      mesh.position.set(
        body.config.position.x,
        body.config.position.y,
        body.config.position.z,
      );
    }
  }
}

let nextBodyId = 1;

export function createMockPhysicsService(): PlayerPhysicsService {
  const bodies = new Map<number, MockBody>();
  const meshSync = new MockBodyMeshSync();

  const groundY = 0;

  const service: PlayerPhysicsService = {
    createBody(config: BodyConfig): number {
      const bodyId = nextBodyId++;
      bodies.set(bodyId, {
        config: {
          ...config,
          position: { ...config.position },
          dimensions: { ...config.dimensions },
        },
        velocity: vec3(),
        enabled: true,
      });
      return bodyId;
    },

    removeBody(bodyId: number): void {
      bodies.delete(bodyId);
      meshSync.unbind(bodyId);
    },

    raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null {
      const staticMask = CollisionGroup.STATIC;
      if (mask !== undefined && (mask & staticMask) === 0) {
        return null;
      }

      const dy = direction.y;
      if (dy >= 0) return null;

      const t = (groundY - origin.y) / dy;
      if (t < 0 || t > maxDist) return null;

      const point = {
        x: origin.x + direction.x * t,
        y: groundY,
        z: origin.z + direction.z * t,
      };

      return {
        bodyId: 0,
        entityId: 0,
        point,
        normal: vec3(0, 1, 0),
        distance: t,
      };
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
      body.velocity = vec3();
    },

    setBodyVelocity(bodyId: number, velocity: Vec3): void {
      const body = bodies.get(bodyId);
      if (!body) return;
      body.velocity = { ...velocity };
    },

    getBodyVelocity(bodyId: number): Vec3 {
      const body = bodies.get(bodyId);
      return body ? { ...body.velocity } : vec3();
    },

    setBodyEnabled(bodyId: number, enabled: boolean): void {
      const body = bodies.get(bodyId);
      if (!body) return;
      body.enabled = enabled;
      if (!enabled) body.velocity = vec3();
    },

    getBodyMeshSync(): BodyMeshSyncBridge {
      return meshSync;
    },

    step(dt: number): void {
      const gravity = -9.82;
      for (const body of bodies.values()) {
        if (!body.enabled || body.config.mass <= 0) continue;

        body.velocity.y += gravity * dt;
        body.config.position.x += body.velocity.x * dt;
        body.config.position.y += body.velocity.y * dt;
        body.config.position.z += body.velocity.z * dt;

        const halfHeight = body.config.dimensions.y * 0.5;
        const groundContact = body.config.position.y - halfHeight <= groundY;
        if (groundContact) {
          body.config.position.y = groundY + halfHeight;
          if (body.velocity.y < 0) body.velocity.y = 0;
        }
      }
      meshSync.sync(bodies);
    },
  };

  service.createBody({
    shape: 'box',
    dimensions: vec3(2000, 0.1, 2000),
    mass: 0,
    position: vec3(0, -0.05, 0),
    collisionGroup: CollisionGroup.STATIC,
    collisionMask: STATIC_COLLISION_MASK,
  });

  return service;
}
