import { WORLD_SIZE } from '../shared/constants';
import type { Vec3 } from '../shared/types';
import type { AiRoadSegment } from './types';

const CELL_SIZE = 2;
const HALF_WORLD = WORLD_SIZE / 2;

export class NavGrid {
  private grid: boolean[][] = [];
  private readonly width: number;
  private readonly height: number;
  readonly cellSize = CELL_SIZE;

  constructor(bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const minX = bounds?.minX ?? -HALF_WORLD;
    const maxX = bounds?.maxX ?? HALF_WORLD;
    const minZ = bounds?.minZ ?? -HALF_WORLD;
    const maxZ = bounds?.maxZ ?? HALF_WORLD;

    this.width = Math.ceil((maxX - minX) / CELL_SIZE);
    this.height = Math.ceil((maxZ - minZ) / CELL_SIZE);
    this.grid = Array.from({ length: this.width }, () => Array(this.height).fill(false));
  }

  buildFromSidewalks(segments: AiRoadSegment[]): void {
    for (const segment of segments) {
      if (!segment.hasSidewalk) continue;
      const swOffset = segment.width / 2 + (segment.type === 'street' ? 1.5 : 2);
      this.markSidewalkAlongSegment(segment, swOffset);
    }
  }

  private markSidewalkAlongSegment(segment: AiRoadSegment, offset: number): void {
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const center = sampleSegment(segment.points, t);
      const tangent = segmentTangent(segment.points, t);
      const nx = -tangent.z;
      const nz = tangent.x;

      for (const side of [-1, 1]) {
        const x = center.x + nx * offset * side;
        const z = center.z + nz * offset * side;
        this.markWalkable(x, z, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  markWalkable(x: number, z: number, width: number, depth: number): void {
    const minGx = Math.floor((x - width / 2 + HALF_WORLD) / CELL_SIZE);
    const maxGx = Math.floor((x + width / 2 + HALF_WORLD) / CELL_SIZE);
    const minGz = Math.floor((z - depth / 2 + HALF_WORLD) / CELL_SIZE);
    const maxGz = Math.floor((z + depth / 2 + HALF_WORLD) / CELL_SIZE);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        if (this.inBounds(gx, gz)) {
          this.grid[gx][gz] = true;
        }
      }
    }
  }

  markUnwalkable(x: number, z: number, width: number, depth: number): void {
    const minGx = Math.floor((x - width / 2 + HALF_WORLD) / CELL_SIZE);
    const maxGx = Math.floor((x + width / 2 + HALF_WORLD) / CELL_SIZE);
    const minGz = Math.floor((z - depth / 2 + HALF_WORLD) / CELL_SIZE);
    const maxGz = Math.floor((z + depth / 2 + HALF_WORLD) / CELL_SIZE);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        if (this.inBounds(gx, gz)) {
          this.grid[gx][gz] = false;
        }
      }
    }
  }

  isWalkable(x: number, z: number): boolean {
    const { gx, gz } = this.worldToGrid({ x, y: 0, z });
    if (!this.inBounds(gx, gz)) return false;
    return this.grid[gx][gz];
  }

  worldToGrid(pos: Vec3): { gx: number; gz: number } {
    return {
      gx: Math.floor((pos.x + HALF_WORLD) / CELL_SIZE),
      gz: Math.floor((pos.z + HALF_WORLD) / CELL_SIZE),
    };
  }

  gridToWorld(gx: number, gz: number): Vec3 {
    return {
      x: gx * CELL_SIZE - HALF_WORLD + CELL_SIZE / 2,
      y: 0.15,
      z: gz * CELL_SIZE - HALF_WORLD + CELL_SIZE / 2,
    };
  }

  getGridSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private inBounds(gx: number, gz: number): boolean {
    return gx >= 0 && gx < this.width && gz >= 0 && gz < this.height;
  }
}

function sampleSegment(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0, z: 0 };
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

function segmentTangent(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) return { x: 1, y: 0, z: 0 };
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
