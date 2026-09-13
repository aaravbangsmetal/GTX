import type { Camera, Material, Object3D, Scene, WebGLRenderer } from 'three';
import type { BodyConfig, EntityId, PlayerStateSnapshot, RaycastHit, Transform, Vec3 } from './types';

export interface DayNightState {
  hour: number;
  sunAngle: number;
  isNight: boolean;
  bloomStrength: number;
}

export interface IRendererService {
  getScene(): Scene;
  getActiveCamera(): Camera;
  getRenderer(): WebGLRenderer;
  addToScene(object: Object3D, layer?: number): void;
  removeFromScene(object: Object3D): void;
  getMaterial(id: string): Material;
  getDayNightState(): DayNightState;
}

export interface IPhysicsService {
  createBody(config: BodyConfig): number;
  removeBody(bodyId: number): void;
  raycast(origin: Vec3, direction: Vec3, maxDist: number, mask?: number): RaycastHit | null;
  getBodyTransform(bodyId: number): Transform;
  setBodyTransform(bodyId: number, transform: Transform): void;
}

export interface RoadNetworkData {
  segments: unknown[];
  intersections: unknown[];
}

export interface MinimapData {
  width: number;
  height: number;
  roads: unknown[];
  districts: unknown[];
  landmarks: unknown[];
  waterBoundary: unknown[];
}

export interface CollisionChunkData {
  chunkId: string;
  vertices: Float32Array;
  indices: Uint32Array;
}

export interface IWorldService {
  getRoadNetwork(): RoadNetworkData;
  getMinimapData(): MinimapData;
  getDistrictAt(position: Vec3): number;
  getSpawnPoint(id: string): Vec3;
  getCollisionData(chunkId: string): CollisionChunkData;
}

export interface IPlayerService {
  getState(): PlayerStateSnapshot;
  getEntityId(): EntityId;
  getPosition(): Vec3;
  isControllable(): boolean;
  teleport(position: Vec3): void;
}

export interface VehicleSnapshot {
  entityId: EntityId;
  type: string;
  speedKmh: number;
  health: number;
}

export interface IVehicleService {
  getVehicle(entityId: EntityId): VehicleSnapshot | null;
  getPlayerVehicle(): EntityId | null;
  getNearbyVehicles(position: Vec3, radius: number): EntityId[];
  spawnVehicle(type: string, position: Vec3): EntityId;
}
