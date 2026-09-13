import * as CANNON from 'cannon-es';
import type { Quat } from '../shared/types';
import { getPhysicsMaterial } from './PhysicsMaterial';
import type {
  BodyFactoryBoxConfig,
  BodyFactorySphereConfig,
} from './types';

function toCannonVec3(v: { x: number; y: number; z: number }): CANNON.Vec3 {
  return new CANNON.Vec3(v.x, v.y, v.z);
}

function toCannonQuat(q: Quat): CANNON.Quaternion {
  return new CANNON.Quaternion(q.x, q.y, q.z, q.w);
}

function bodyTypeFromMass(mass: number): CANNON.BodyType {
  return mass === 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC;
}

export class BodyFactory {
  constructor(private readonly world: CANNON.World) {}

  createBox(config: BodyFactoryBoxConfig): CANNON.Body {
    const halfExtents = toCannonVec3({
      x: config.dimensions.x / 2,
      y: config.dimensions.y / 2,
      z: config.dimensions.z / 2,
    });
    const shape = new CANNON.Box(halfExtents);
    shape.collisionFilterGroup = config.group;
    shape.collisionFilterMask = config.mask;

    const body = new CANNON.Body({
      mass: config.mass,
      position: toCannonVec3(config.position),
      quaternion: config.rotation ? toCannonQuat(config.rotation) : undefined,
      collisionFilterGroup: config.group,
      collisionFilterMask: config.mask,
      material: getPhysicsMaterial(config.material),
      type: bodyTypeFromMass(config.mass),
    });

    body.addShape(shape);
    this.world.addBody(body);
    return body;
  }

  createSphere(config: BodyFactorySphereConfig): CANNON.Body {
    const shape = new CANNON.Sphere(config.radius);
    shape.collisionFilterGroup = config.group;
    shape.collisionFilterMask = config.mask;

    const body = new CANNON.Body({
      mass: config.mass,
      position: toCannonVec3(config.position),
      collisionFilterGroup: config.group,
      collisionFilterMask: config.mask,
      material: getPhysicsMaterial(config.material),
      type: bodyTypeFromMass(config.mass),
    });

    body.addShape(shape);
    this.world.addBody(body);
    return body;
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
