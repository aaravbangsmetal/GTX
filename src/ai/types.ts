import type { EntityId, Vec3 } from '../shared/types';

export enum NPCType {
  PEDESTRIAN,
  POLICE_OFFICER,
  POLICE_DRIVER,
  HOSTILE,
  VENDOR,
}

export enum NPCBehaviorState {
  IDLE,
  WALKING,
  FLEEING,
  AGGRESSIVE,
  DEAD,
  IN_VEHICLE,
}

export interface NPCConfig {
  type: NPCType;
  walkSpeed: number;
  runSpeed: number;
  health: number;
  aggression: number;
  fleeDistance: number;
}

export type VehicleTypeId = 'sedan' | 'sportscar' | 'motorcycle' | 'truck' | 'police';

export interface TrafficVehicleConfig {
  type: VehicleTypeId;
  maxSpeed: number;
  followDistance: number;
  laneOffset: number;
}

export interface PathNode {
  position: Vec3;
  connections: number[];
}

export interface AiRoadSegment {
  id: string;
  type: 'highway' | 'boulevard' | 'street' | 'alley';
  lanes: number;
  points: Vec3[];
  width: number;
  hasSidewalk: boolean;
  speedLimit: number;
}

export interface AiIntersection {
  id: string;
  position: Vec3;
  connectedRoads: string[];
  hasTrafficLight: boolean;
  type: 'cross' | 't' | 'roundabout';
  orientation: 'ns' | 'ew';
}

export interface AiRoadNetworkData {
  segments: AiRoadSegment[];
  intersections: AiIntersection[];
}

export interface TrafficSpawnPoint {
  roadId: string;
  t: number;
  lane: number;
  direction: 1 | -1;
}

export interface VehicleAIInput {
  throttle: number;
  brake: number;
  steer: number;
}

export interface AIVehicleState {
  entityId: EntityId;
  type: string;
  position: Vec3;
  heading: number;
  speedKmh: number;
  health: number;
}

export interface IVehicleAIControl {
  getState(entityId: EntityId): AIVehicleState | null;
  setAIInput(entityId: EntityId, input: VehicleAIInput): void;
  spawnVehicle(type: string, position: Vec3): EntityId;
  despawnVehicle(entityId: EntityId): void;
  getNearbyVehicles(position: Vec3, radius: number): EntityId[];
}

export const DEFAULT_PEDESTRIAN_CONFIG: NPCConfig = {
  type: NPCType.PEDESTRIAN,
  walkSpeed: 1.5,
  runSpeed: 5,
  health: 100,
  aggression: 0,
  fleeDistance: 8,
};

export const DEFAULT_TRAFFIC_CONFIG: TrafficVehicleConfig = {
  type: 'sedan',
  maxSpeed: 32,
  followDistance: 8,
  laneOffset: 0,
};

export const PED_DESPAWN_DISTANCE = 80;
export const TRAFFIC_DESPAWN_DISTANCE = 250;
export const TRAFFIC_SPAWN_MIN_DISTANCE = 150;
export const TRAFFIC_SPAWN_MAX_DISTANCE = 200;
export const SHOOT_FLEE_RADIUS = 30;
export const HORN_SCATTER_RADIUS = 10;
export const COLLISION_FLEE_RADIUS = 15;
export const COLLISION_IMPULSE_THRESHOLD = 500;
