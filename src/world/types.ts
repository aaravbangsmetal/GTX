import type { DistrictId, Vec3 } from '../shared/types';

export interface Vec2 {
  x: number;
  z: number;
}

export interface ChunkId {
  x: number;
  z: number;
  key: string;
}

export interface DistrictBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DistrictConfig {
  id: DistrictId;
  bounds: DistrictBounds;
  buildingDensity: number;
  maxFloors: number;
  styles: BuildingStyle[];
  propDensity: number;
  color: string;
}

export type BuildingStyle = 'artdeco' | 'motel' | 'rowhouse' | 'warehouse' | 'mansion';

export interface BuildingPlot {
  id: string;
  rect: { x: number; z: number; width: number; depth: number };
  floors: number;
  style: BuildingStyle;
  colorIndex: number;
  district: DistrictId;
  rotation: number;
}

export interface RoadSegment {
  id: string;
  type: 'highway' | 'boulevard' | 'street' | 'alley';
  lanes: number;
  points: Vec3[];
  width: number;
  hasSidewalk: boolean;
  speedLimit: number;
  district: DistrictId;
}

export interface Intersection {
  id: string;
  position: Vec3;
  connectedRoads: string[];
  hasTrafficLight: boolean;
  type: 'cross' | 't' | 'roundabout';
}

export type PropType =
  | 'palm'
  | 'bench'
  | 'lamp'
  | 'trash'
  | 'neon'
  | 'busstop'
  | 'umbrella'
  | 'container';

export interface PropPlacement {
  type: PropType;
  position: Vec3;
  rotation: number;
  scale: number;
  district: DistrictId;
}

export interface NearestRoadResult {
  segment: RoadSegment;
  t: number;
  point: Vec3;
}

export interface RoadNetworkData {
  segments: RoadSegment[];
  intersections: Intersection[];
  sidewalks: Vec3[][];
  getNearestRoad: (pos: Vec3) => NearestRoadResult;
  getPath: (from: Vec3, to: Vec3) => Vec3[];
}

export interface MinimapData {
  width: number;
  height: number;
  roads: Array<{ points: Vec2[]; width: number; type: string }>;
  districts: Array<{ id: DistrictId; polygon: Vec2[]; color: string }>;
  landmarks: Array<{ id: string; position: Vec2; label: string }>;
  waterBoundary: Vec2[];
}

export interface CollisionChunkData {
  chunkId: string;
  vertices: Float32Array;
  indices: Uint32Array;
}

export interface SpawnPoints {
  player: Vec3;
  mission_1_target: Vec3;
  mission_2_area: Vec3;
  mission_3_pickup: Vec3;
  mission_3_delivery: Vec3;
  police_station: Vec3;
  hospital: Vec3;
}

export interface MapData {
  districts: DistrictConfig[];
  roads: RoadSegment[];
  intersections: Intersection[];
  spawnPoints: SpawnPoints;
  buildingPlots: BuildingPlot[];
}

export interface ChunkData {
  id: ChunkId;
  group: import('three').Group;
  collisionMeshes: import('three').Object3D[];
  district: DistrictId;
  fadeProgress: number;
}

export function makeChunkId(cx: number, cz: number): ChunkId {
  return { x: cx, z: cz, key: `chunk_${cx}_${cz}` };
}

export function worldToChunk(pos: Vec3): ChunkId {
  const cx = Math.floor(pos.x / 128);
  const cz = Math.floor(pos.z / 128);
  return makeChunkId(cx, cz);
}
