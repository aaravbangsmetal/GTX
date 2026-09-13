import { vec3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import { sampleSpline } from '../world/geometry-utils';
import type { RoadNetworkData, RoadSegment } from '../world/types';

export interface TrafficSpawnPoint {
  roadId: string;
  t: number;
  lane: number;
  direction: 1 | -1;
}

export const TRAFFIC_SPAWN_POINTS: TrafficSpawnPoint[] = [
  { roadId: 'hwy_north', t: 0.15, lane: 0, direction: 1 },
  { roadId: 'hwy_north', t: 0.35, lane: 1, direction: 1 },
  { roadId: 'hwy_north', t: 0.55, lane: 0, direction: -1 },
  { roadId: 'hwy_north', t: 0.75, lane: 1, direction: -1 },
  { roadId: 'hwy_south', t: 0.2, lane: 0, direction: 1 },
  { roadId: 'hwy_south', t: 0.45, lane: 1, direction: -1 },
  { roadId: 'hwy_south', t: 0.7, lane: 0, direction: 1 },
  { roadId: 'hwy_east', t: 0.25, lane: 0, direction: 1 },
  { roadId: 'hwy_east', t: 0.5, lane: 1, direction: -1 },
  { roadId: 'hwy_east', t: 0.8, lane: 0, direction: 1 },
  { roadId: 'hwy_west', t: 0.3, lane: 0, direction: -1 },
  { roadId: 'hwy_west', t: 0.6, lane: 1, direction: 1 },
  { roadId: 'blvd_ocean', t: 0.2, lane: 0, direction: 1 },
  { roadId: 'blvd_ocean', t: 0.5, lane: 1, direction: -1 },
  { roadId: 'blvd_ocean', t: 0.8, lane: 0, direction: 1 },
  { roadId: 'blvd_downtown', t: 0.15, lane: 0, direction: 1 },
  { roadId: 'blvd_downtown', t: 0.4, lane: 1, direction: -1 },
  { roadId: 'blvd_downtown', t: 0.65, lane: 0, direction: 1 },
  { roadId: 'blvd_havana', t: 0.25, lane: 0, direction: 1 },
  { roadId: 'blvd_havana', t: 0.55, lane: 1, direction: -1 },
  { roadId: 'blvd_coast', t: 0.3, lane: 0, direction: 1 },
  { roadId: 'blvd_coast', t: 0.6, lane: 1, direction: -1 },
  { roadId: 'blvd_coast', t: 0.85, lane: 0, direction: 1 },
  { roadId: 'blvd_port', t: 0.2, lane: 0, direction: 1 },
  { roadId: 'blvd_port', t: 0.5, lane: 1, direction: -1 },
  { roadId: 'blvd_island', t: 0.25, lane: 0, direction: 1 },
  { roadId: 'blvd_island', t: 0.5, lane: 1, direction: -1 },
  { roadId: 'blvd_island', t: 0.75, lane: 0, direction: 1 },
  { roadId: 'hwy_north', t: 0.9, lane: 0, direction: 1 },
];

function findRoadSegment(roadNetwork: RoadNetworkData, roadId: string): RoadSegment | null {
  const segment = roadNetwork.segments.find((s) => s.id === roadId);
  return segment ?? null;
}

export function getTrafficSpawnPosition(
  roadNetwork: RoadNetworkData,
  point: TrafficSpawnPoint,
): Vec3 {
  const segment = findRoadSegment(roadNetwork, point.roadId);
  if (!segment || segment.points.length < 2) {
    return vec3(0, 1, 0);
  }

  const center = sampleSpline(segment.points, point.t);
  const laneOffset = (point.lane - 0.5) * (segment.width / segment.lanes);
  const [a, b] = segment.points;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  const perpX = (-dz / len) * laneOffset * point.direction;
  const perpZ = (dx / len) * laneOffset * point.direction;

  return {
    x: center.x + perpX,
    y: 1.5,
    z: center.z + perpZ,
  };
}
