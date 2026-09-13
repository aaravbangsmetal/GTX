import type { EntityId, Vec3 } from '../shared/types';

export enum VehicleState {
  PARKED,
  DRIVEN,
  AI_CONTROLLED,
  DESTROYED,
  SUBMERGED,
}

export type VehicleTypeId = 'sedan' | 'sportscar' | 'motorcycle' | 'truck' | 'police';

export interface VehicleSnapshot {
  entityId: EntityId;
  type: VehicleTypeId;
  state: VehicleState;
  position: Vec3;
  speed: number;
  speedKmh: number;
  health: number;
  driverId: EntityId | null;
  heading: number;
}

export interface VehicleTypeConfig {
  id: VehicleTypeId;
  name: string;
  mass: number;
  maxSpeed: number;
  acceleration: number;
  brakeForce: number;
  steerSpeed: number;
  grip: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  suspensionRestLength: number;
  engineForce: number;
  dimensions: Vec3;
  wheelRadius: number;
  wheelCount: 2 | 4;
  modelPath: string;
  seatOffset: Vec3;
}

export interface VehicleInput {
  throttle: number;
  steer: number;
  brake: boolean;
  handbrake: boolean;
}

export interface WheelInfo {
  position: Vec3;
  radius: number;
  isFront: boolean;
  suspensionLength: number;
  isGrounded: boolean;
  groundNormal: Vec3;
  steerAngle: number;
  spinAngle: number;
}
