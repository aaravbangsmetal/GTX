export { PhysicsSystem } from './PhysicsSystem';
export { PhysicsWorld } from './PhysicsWorld';
export { BodyFactory } from './BodyFactory';
export { BodyMeshSync } from './BodyMeshSync';
export { ConstraintManager } from './ConstraintManager';
export { TrimeshBuilder } from './TrimeshBuilder';
export { PhysicsRaycaster } from './Raycaster';
export { CollisionGroup, COLLISION_MASKS } from './CollisionGroups';
export { PHYSICS_MATERIALS, getPhysicsMaterial } from './PhysicsMaterial';
export { createPhysicsSystem } from './createSystem';
export type {
  PhysicsBodyHandle,
  PhysicsConfig,
  RaycastOptions,
  ContactEvent,
} from './types';
