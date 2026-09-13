import * as CANNON from 'cannon-es';
import type { IPhysicsService } from '../../shared/services';
import type { BodyConfig, RaycastHit, Transform, Vec3 } from '../../shared/types';
import { COLLISION_MASKS, CollisionGroup } from '../collision-groups';

export interface VehiclePhysicsService extends IPhysicsService {
  getCannonBody(bodyId: number): CANNON.Body;
  getWorld(): CANNON.World;
  step(dt: number): void;
}

export class MockPhysicsService implements VehiclePhysicsService {
  private world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  private bodies = new Map<number, CANNON.Body>();
  private nextBodyId = 1;
  private groundBodyId: number;

  constructor() {
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.5;
    this.world.defaultContactMaterial.restitution = 0.1;

    const groundShape = new CANNON.Plane();
    const ground = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    ground.addShape(groundShape);
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.position.set(0, 0, 0);
    ground.collisionFilterGroup = CollisionGroup.STATIC;
    ground.collisionFilterMask = COLLISION_MASKS.STATIC;
    this.world.addBody(ground);
    this.groundBodyId = this.nextBodyId++;
    this.bodies.set(this.groundBodyId, ground);
  }

  createBody(config: BodyConfig): number {
    const id = this.nextBodyId++;
    let shape: CANNON.Shape;

    switch (config.shape) {
      case 'sphere':
        shape = new CANNON.Sphere(config.dimensions.x);
        break;
      case 'box':
      default:
        shape = new CANNON.Box(
          new CANNON.Vec3(
            config.dimensions.x / 2,
            config.dimensions.y / 2,
            config.dimensions.z / 2,
          ),
        );
    }

    const body = new CANNON.Body({
      mass: config.mass,
      type: config.mass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC,
    });
    body.addShape(shape);
    body.position.set(config.position.x, config.position.y, config.position.z);
    body.collisionFilterGroup = config.collisionGroup;
    body.collisionFilterMask = config.collisionMask;
    body.linearDamping = 0.05;
    body.angularDamping = 0.3;

    this.world.addBody(body);
    this.bodies.set(id, body);
    return id;
  }

  removeBody(bodyId: number): void {
    const body = this.bodies.get(bodyId);
    if (!body || bodyId === this.groundBodyId) return;
    this.world.removeBody(body);
    this.bodies.delete(bodyId);
  }

  raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null {
    const from = new CANNON.Vec3(origin.x, origin.y, origin.z);
    const to = new CANNON.Vec3(
      origin.x + direction.x * maxDist,
      origin.y + direction.y * maxDist,
      origin.z + direction.z * maxDist,
    );

    const result = new CANNON.RaycastResult();
    const hit = this.world.raycastClosest(from, to, { skipBackfaces: true }, result);
    if (!hit || !result.hasHit || !result.body) return null;

    if (mask !== undefined && (result.body.collisionFilterGroup & mask) === 0) {
      return null;
    }

    let bodyId = 0;
    for (const [id, body] of this.bodies) {
      if (body === result.body) {
        bodyId = id;
        break;
      }
    }

    return {
      bodyId,
      entityId: 0,
      point: { x: result.hitPointWorld.x, y: result.hitPointWorld.y, z: result.hitPointWorld.z },
      normal: {
        x: result.hitNormalWorld.x,
        y: result.hitNormalWorld.y,
        z: result.hitNormalWorld.z,
      },
      distance: result.distance,
    };
  }

  getBodyTransform(bodyId: number): Transform {
    const body = this.bodies.get(bodyId);
    if (!body) {
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      };
    }
    return {
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      rotation: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  setBodyTransform(bodyId: number, transform: Transform): void {
    const body = this.bodies.get(bodyId);
    if (!body) return;
    body.position.set(transform.position.x, transform.position.y, transform.position.z);
    body.quaternion.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      transform.rotation.w,
    );
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  }

  getCannonBody(bodyId: number): CANNON.Body {
    const body = this.bodies.get(bodyId);
    if (!body) throw new Error(`Body ${bodyId} not found`);
    return body;
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  step(dt: number): void {
    this.world.step(dt);
  }
}

export function asVehiclePhysicsService(physics: IPhysicsService): VehiclePhysicsService {
  if ('getCannonBody' in physics && 'getWorld' in physics && 'step' in physics) {
    return physics as VehiclePhysicsService;
  }
  throw new Error('Physics service does not support vehicle body access');
}
