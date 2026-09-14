import * as CANNON from 'cannon-es';
import type { Quat } from '../shared/types';
import { getPhysicsMaterial } from './PhysicsMaterial';
import type {
  BodyFactoryBoxConfig,
  BodyFactoryCapsuleConfig,
  BodyFactoryCylinderConfig,
  BodyFactorySphereConfig,
  BodyFactoryTrimeshConfig,
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
    return body;
  }

  createCapsule(config: BodyFactoryCapsuleConfig): CANNON.Body {
    const cylinderHeight = Math.max(config.height - config.radius * 2, 0.01);
    const body = new CANNON.Body({
      mass: config.mass,
      position: toCannonVec3(config.position),
      collisionFilterGroup: config.group,
      collisionFilterMask: config.mask,
      material: getPhysicsMaterial(config.material),
      type: bodyTypeFromMass(config.mass),
    });

    const cylinder = new CANNON.Cylinder(
      config.radius,
      config.radius,
      cylinderHeight,
      12,
    );
    cylinder.collisionFilterGroup = config.group;
    cylinder.collisionFilterMask = config.mask;
    const upright = new CANNON.Quaternion();
    upright.setFromEuler(Math.PI / 2, 0, 0);
    body.addShape(cylinder, new CANNON.Vec3(0, 0, 0), upright);

    const topSphere = new CANNON.Sphere(config.radius);
    topSphere.collisionFilterGroup = config.group;
    topSphere.collisionFilterMask = config.mask;
    body.addShape(topSphere, new CANNON.Vec3(0, cylinderHeight / 2 + config.radius, 0));

    const bottomSphere = new CANNON.Sphere(config.radius);
    bottomSphere.collisionFilterGroup = config.group;
    bottomSphere.collisionFilterMask = config.mask;
    body.addShape(bottomSphere, new CANNON.Vec3(0, -(cylinderHeight / 2 + config.radius), 0));

    return body;
  }

  createTrimesh(config: BodyFactoryTrimeshConfig): CANNON.Body {
    const vertices = Array.from(config.vertices);
    const indices = Array.from(config.indices);
    const shape = new CANNON.Trimesh(vertices, indices);
    shape.collisionFilterGroup = config.group;
    shape.collisionFilterMask = config.mask;

    const body = new CANNON.Body({
      mass: 0,
      position: toCannonVec3(config.position),
      collisionFilterGroup: config.group,
      collisionFilterMask: config.mask,
      type: CANNON.Body.STATIC,
    });

    body.addShape(shape);
    return body;
  }

  createCylinder(config: BodyFactoryCylinderConfig): CANNON.Body {
    const shape = new CANNON.Cylinder(
      config.radiusTop,
      config.radiusBottom,
      config.height,
      12,
    );
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
    return body;
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
