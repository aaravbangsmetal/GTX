import type { Vec3 } from '../shared/types';
import type { RoadSegment } from './types';

export function sampleSpline(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) {
    return points[0] ?? { x: 0, y: 0, z: 0 };
  }
  const segments = points.length - 1;
  const scaled = t * segments;
  const idx = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - idx;
  const a = points[idx];
  const b = points[idx + 1];
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
    z: a.z + (b.z - a.z) * localT,
  };
}

export function splineTangent(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) {
    return { x: 1, y: 0, z: 0 };
  }
  const segments = points.length - 1;
  const scaled = t * segments;
  const idx = Math.min(Math.floor(scaled), segments - 1);
  const a = points[idx];
  const b = points[idx + 1];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;
  return { x: dx / len, y: 0, z: dz / len };
}

export function nearestPointOnRoad(
  pos: Vec3,
  segment: RoadSegment,
): { t: number; point: Vec3; dist: number } {
  const [a, b] = segment.points;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((pos.x - a.x) * dx + (pos.z - a.z) * dz) / lenSq));
  }
  const point = {
    x: a.x + t * dx,
    y: 0,
    z: a.z + t * dz,
  };
  const ddx = pos.x - point.x;
  const ddz = pos.z - point.z;
  const dist = Math.sqrt(ddx * ddx + ddz * ddz);
  return { t, point, dist };
}

export function chunkContains(cx: number, cz: number, x: number, z: number, size = 128): boolean {
  const minX = cx * size;
  const maxX = minX + size;
  const minZ = cz * size;
  const maxZ = minZ + size;
  return x >= minX && x < maxX && z >= minZ && z < maxZ;
}
