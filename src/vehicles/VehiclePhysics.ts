import * as CANNON from 'cannon-es';
import type { Quat, Vec3 } from '../shared/types';
import { COLLISION_MASKS, CollisionGroup } from './collision-groups';
import { headingFromQuat, quatFromHeading, speedFromVelocity } from './helpers';
import type { VehiclePhysicsService } from './__mocks__/MockPhysicsService';
import { clamp, lerp } from '../shared/math';
import type { VehicleInput, VehicleTypeConfig, WheelInfo } from './types';
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
  private currentSteer = 0;
  private chassisBody: CANNON.Body | null = null;
  private gripMultiplier = 1;

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

  update(input: VehicleInput, dt: number): { speed: number; speedKmh: number; rpm: number } {
    if (!this.chassisBody) {
      return { speed: 0, speedKmh: 0, rpm: 0 };
    }

    const body = this.chassisBody;
    const transform = this.physics.getBodyTransform(this.bodyId);
    const chassisQuat = transform.rotation;
    const chassisPos = transform.position;

    this.wheelRaycaster.raycastWheels(
      chassisPos,
      chassisQuat,
      this.wheels,
      this.config.suspensionRestLength,
    );

    for (const wheel of this.wheels) {
      this.wheelRaycaster.applySuspensionForce(wheel, body, this.config, chassisQuat);
    }

    const targetSteer = input.steer * this.config.steerSpeed;
    this.currentSteer = lerp(this.currentSteer, targetSteer, clamp(dt * 8, 0, 1));

    const speed = speedFromVelocity({ x: body.velocity.x, y: body.velocity.y, z: body.velocity.z });
    const speedRatio = clamp(speed / this.config.maxSpeed, 0, 1);
    const steerScale = 1 - speedRatio * 0.5;
    const effectiveSteer = this.currentSteer * steerScale;

    for (const wheel of this.wheels) {
      this.wheelRaycaster.applySteering(wheel, wheel.isFront ? effectiveSteer : 0);
      if (wheel.isFront) {
        wheel.steerAngle = effectiveSteer;
      }
    }

    this.gripMultiplier = input.handbrake ? 0.3 : 1;
    const engineForce = input.throttle * this.config.engineForce;
    for (const wheel of this.wheels) {
      if (!wheel.isFront) {
        const grip = this.config.grip * this.gripMultiplier;
        this.wheelRaycaster.applyEngineForce(wheel, engineForce, body, chassisQuat, grip);
      }
    }

    if (input.brake || (input.throttle === 0 && speed < 1)) {
      const brakeAmount = input.brake ? this.config.brakeForce : this.config.brakeForce * 0.3;
      for (const wheel of this.wheels) {
        const grip = input.handbrake && !wheel.isFront
          ? this.config.grip * 0.3
          : this.config.grip;
        this.wheelRaycaster.applyBrakeForce(wheel, brakeAmount, body, chassisQuat, grip);
      }
    }

    if (speed > this.config.maxSpeed) {
      const scale = this.config.maxSpeed / speed;
      body.velocity.x *= scale;
      body.velocity.z *= scale;
    }

    const wheelSpin = speed / this.config.wheelRadius;
    for (const wheel of this.wheels) {
      wheel.spinAngle += wheelSpin * dt;
    }

    const speedKmh = speed * 3.6;
    const rpm = 800 + speedKmh * 40;
    return { speed, speedKmh, rpm };
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

  getSpeedKmh(): number {
    return this.getSpeed() * 3.6;
  }

  applyImpulse(impulse: Vec3, point: Vec3): void {
    if (!this.chassisBody) return;
    this.chassisBody.applyImpulse(
      new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
      new CANNON.Vec3(point.x, point.y, point.z),
    );
  }

  setPosition(position: Vec3, heading: number): void {
    this.physics.setBodyTransform(this.bodyId, {
      position,
      rotation: quatFromHeading(heading),
      scale: { x: 1, y: 1, z: 1 },
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
