import type { EntityId, Quat, Vec3 } from '../shared/types';

export interface PhysicsBodyHandle {
  bodyId: number;
  entityId: EntityId;
  type: 'static' | 'dynamic' | 'kinematic';
  collisionGroup: number;
}

export interface PhysicsConfig {
  gravity: Vec3;
  solverIterations: number;
  broadphase: 'sap' | 'naive';
  allowSleep: boolean;
}

export interface RaycastOptions {
  origin: Vec3;
  direction: Vec3;
  maxDistance: number;
  collisionMask?: number;
  skipBodyId?: number;
}

export interface ContactEvent {
  bodyA: number;
  bodyB: number;
  entityA: EntityId;
  entityB: EntityId;
  point: Vec3;
  normal: Vec3;
  impulse: number;
}

export interface BodyFactoryBoxConfig {
  dimensions: Vec3;
  mass: number;
  position: Vec3;
  rotation?: Quat;
  group: number;
  mask: number;
  material?: string;
}

export interface BodyFactorySphereConfig {
  radius: number;
  mass: number;
  position: Vec3;
  group: number;
  mask: number;
  material?: string;
}

export interface BodyFactoryCapsuleConfig {
  radius: number;
  height: number;
  mass: number;
  position: Vec3;
  group: number;
  mask: number;
  material?: string;
}

export interface BodyFactoryTrimeshConfig {
  vertices: Float32Array;
  indices: Uint32Array;
  position: Vec3;
  group: number;
  mask: number;
}

export interface BodyFactoryCylinderConfig {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  mass: number;
  position: Vec3;
  group: number;
  mask: number;
  material?: string;
}
