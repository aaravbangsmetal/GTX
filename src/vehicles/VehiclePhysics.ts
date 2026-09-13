import * as CANNON from 'cannon-es';
import type { Quat, Vec3 } from '../shared/types';
import { COLLISION_MASKS, CollisionGroup } from './collision-groups';
import { headingFromQuat, quatFromHeading, speedFromVelocity } from './helpers';
import type { VehiclePhysicsService } from './__mocks__/MockPhysicsService';
import type { VehicleTypeConfig, WheelInfo } from './types';
import { WheelRaycaster } from './WheelRaycaster';

function createWheelLayout(config: VehicleTypeConfig): WheelInfo[] {
  const halfW = config.dimensions.z / 2;
  const halfL = config.dimensions.x / 2;
  const wheelY = -config.dimensions.y / 2 + 0.1;

  if (config.wheelCount === 2) {
    return [
      {
        position: { x: 0, y: wheelY, z: -halfL * 0.7 },
        radius: config.wheelRadius,
        isFront: true,
        suspensionLength: config.suspensionRestLength,
        isGrounded: false,
        groundNormal: { x: 0, y: 1, z: 0 },
        steerAngle: 0,
        spinAngle: 0,
      },
      {
        position: { x: 0, y: wheelY, z: halfL * 0.7 },
        radius: config.wheelRadius,
        isFront: false,
        suspensionLength: config.suspensionRestLength,
        isGrounded: false,
        groundNormal: { x: 0, y: 1, z: 0 },
        steerAngle: 0,
        spinAngle: 0,
      },
    ];
  }

  return [
    {
      position: { x: -halfW, y: wheelY, z: -halfL * 0.75 },
      radius: config.wheelRadius,
      isFront: true,
      suspensionLength: config.suspensionRestLength,
      isGrounded: false,
      groundNormal: { x: 0, y: 1, z: 0 },
      steerAngle: 0,
      spinAngle: 0,
    },
    {
      position: { x: halfW, y: wheelY, z: -halfL * 0.75 },
      radius: config.wheelRadius,
      isFront: true,
      suspensionLength: config.suspensionRestLength,
      isGrounded: false,
      groundNormal: { x: 0, y: 1, z: 0 },
      steerAngle: 0,
      spinAngle: 0,
    },
    {
      position: { x: -halfW, y: wheelY, z: halfL * 0.75 },
      radius: config.wheelRadius,
      isFront: false,
      suspensionLength: config.suspensionRestLength,
      isGrounded: false,
      groundNormal: { x: 0, y: 1, z: 0 },
      steerAngle: 0,
      spinAngle: 0,
    },
    {
      position: { x: halfW, y: wheelY, z: halfL * 0.75 },
      radius: config.wheelRadius,
      isFront: false,
      suspensionLength: config.suspensionRestLength,
      isGrounded: false,
      groundNormal: { x: 0, y: 1, z: 0 },
      steerAngle: 0,
      spinAngle: 0,
    },
  ];
}

export class VehiclePhysics {
  readonly wheels: WheelInfo[];
  private bodyId: number = 0;
  private wheelRaycaster: WheelRaycaster;
  private chassisBody: CANNON.Body | null = null;

  constructor(
    private physics: VehiclePhysicsService,
    private config: VehicleTypeConfig,
  ) {
    this.wheels = createWheelLayout(config);
    this.wheelRaycaster = new WheelRaycaster(physics);
  }

  init(position: Vec3, rotation: Quat): void {
    this.bodyId = this.physics.createBody({
      shape: 'box',
      dimensions: this.config.dimensions,
      mass: this.config.mass,
      position,
      collisionGroup: CollisionGroup.VEHICLE,
      collisionMask: COLLISION_MASKS.VEHICLE,
    });
    this.physics.setBodyTransform(this.bodyId, {
      position,
      rotation,
      scale: { x: 1, y: 1, z: 1 },
    });
    this.chassisBody = this.physics.getCannonBody(this.bodyId);
  }

  getBodyId(): number {
    return this.bodyId;
  }

  getSpeed(): number {
    if (!this.chassisBody) return 0;
    return speedFromVelocity({
      x: this.chassisBody.velocity.x,
      y: this.chassisBody.velocity.y,
      z: this.chassisBody.velocity.z,
    });
  }

  getPosition(): Vec3 {
    return this.physics.getBodyTransform(this.bodyId).position;
  }

  getRotation(): Quat {
    return this.physics.getBodyTransform(this.bodyId).rotation;
  }

  getHeading(): number {
    return headingFromQuat(this.getRotation());
  }

  dispose(): void {
    if (this.bodyId) {
      this.physics.removeBody(this.bodyId);
      this.bodyId = 0;
      this.chassisBody = null;
    }
  }
}
