import { distance3, vec3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import type { AiRoadNetworkData, AiRoadSegment } from './types';
import { NavGrid } from './NavGrid';

interface NearestRoadResult {
  segment: AiRoadSegment;
  t: number;
  point: Vec3;
}

export class RoadPathfinder {
  private segments: AiRoadSegment[];
  private graph = new Map<string, string[]>();

  constructor(roadNetwork: AiRoadNetworkData) {
    this.segments = roadNetwork.segments;
    this.buildGraph(roadNetwork);
  }

  private buildGraph(roadNetwork: AiRoadNetworkData): void {
    for (const seg of this.segments) {
      if (!this.graph.has(seg.id)) {
        this.graph.set(seg.id, []);
      }
    }
    for (const inter of roadNetwork.intersections) {
      const roads = inter.connectedRoads;
      for (let i = 0; i < roads.length; i++) {
        for (let j = i + 1; j < roads.length; j++) {
          this.linkRoads(roads[i], roads[j]);
        }
      }
    }
  }

  private linkRoads(a: string, b: string): void {
    const listA = this.graph.get(a) ?? [];
    if (!listA.includes(b)) listA.push(b);
    this.graph.set(a, listA);
    const listB = this.graph.get(b) ?? [];
    if (!listB.includes(a)) listB.push(b);
    this.graph.set(b, listB);
  }

  findPath(from: Vec3, to: Vec3): Vec3[] {
    const start = this.getNearestPointOnRoad(from);
    const end = this.getNearestPointOnRoad(to);
    const pathIds = this.aStar(start.segment.id, end.segment.id);

    const points: Vec3[] = [from];
    for (const id of pathIds) {
      const seg = this.segments.find((s) => s.id === id);
      if (seg) {
        for (let i = 0; i < seg.points.length; i++) {
          const p = seg.points[i];
          points.push({ x: p.x, y: 0.1, z: p.z });
        }
      }
    }
    points.push(to);
    return this.dedupePath(points);
  }

  getNearestPointOnRoad(pos: Vec3): NearestRoadResult & { segmentId: string } {
    const result = this.findNearestRoad(pos);
    return { ...result, segmentId: result.segment.id };
  }

  getLanePosition(segmentId: string, t: number, lane: number, _direction: 1 | -1): Vec3 {
    const segment = this.segments.find((s) => s.id === segmentId);
    if (!segment) return vec3();
    const center = sampleSegment(segment.points, t);
    const tangent = segmentTangent(segment.points, t);
    const laneOffset = (lane - (segment.lanes - 1) / 2) * 3.5;
    return {
      x: center.x - tangent.z * laneOffset,
      y: 0.1,
      z: center.z + tangent.x * laneOffset,
    };
  }

  getRandomRoadPoint(center: Vec3, minDist: number, maxDist: number): Vec3 {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const target = {
      x: center.x + Math.cos(angle) * dist,
      y: center.y,
      z: center.z + Math.sin(angle) * dist,
    };
    const nearest = this.getNearestPointOnRoad(target);
    return nearest.point;
  }

  private findNearestRoad(pos: Vec3): NearestRoadResult {
    let best: NearestRoadResult | null = null;
    let bestDist = Infinity;

    for (const segment of this.segments) {
      const result = nearestPointOnSegment(pos, segment);
      if (result.dist < bestDist) {
        bestDist = result.dist;
        best = result;
      }
    }

    return best ?? { segment: this.segments[0], t: 0, point: vec3() };
  }

  private aStar(startId: string, endId: string): string[] {
    if (startId === endId) return [startId];

    const open = new Set([startId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startId, 0]]);

    while (open.size > 0) {
      let current = startId;
      let lowest = Infinity;
      for (const id of open) {
        const score = gScore.get(id) ?? Infinity;
        if (score < lowest) {
          lowest = score;
          current = id;
        }
      }

      if (current === endId) {
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current)!;
          path.unshift(current);
        }
        return path;
      }

      open.delete(current);
      const neighbors = this.graph.get(current) ?? [];
      for (const neighbor of neighbors) {
        const tentative = (gScore.get(current) ?? Infinity) + 1;
        if (tentative < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentative);
          open.add(neighbor);
        }
      }
    }

    return [startId, endId];
  }

  private dedupePath(points: Vec3[]): Vec3[] {
    const result: Vec3[] = [];
    for (const p of points) {
      const last = result[result.length - 1];
      if (!last || distance3(last, p) > 2) {
        result.push(p);
      }
    }
    return result;
  }
}

export class PedestrianPathfinder {
  constructor(private navGrid: NavGrid) {}

  findPath(from: Vec3, to: Vec3): Vec3[] {
    const start = this.navGrid.worldToGrid(from);
    const end = this.navGrid.worldToGrid(to);

    if (!this.isGridWalkable(start.gx, start.gz) || !this.isGridWalkable(end.gx, end.gz)) {
      return [to];
    }

    const path = this.aStar(start.gx, start.gz, end.gx, end.gz);
    if (path.length === 0) return [to];

    return path.map(([gx, gz]) => this.navGrid.gridToWorld(gx, gz));
  }

  getRandomWalkablePoint(center: Vec3, radius: number): Vec3 {
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;
      if (this.navGrid.isWalkable(x, z)) {
        return { x, y: 0.15, z };
      }
    }
    return { x: center.x, y: 0.15, z: center.z };
  }

  private isGridWalkable(gx: number, gz: number): boolean {
    const world = this.navGrid.gridToWorld(gx, gz);
    return this.navGrid.isWalkable(world.x, world.z);
  }

  private aStar(startGx: number, startGz: number, endGx: number, endGz: number): [number, number][] {
    const key = (gx: number, gz: number) => `${gx},${gz}`;
    const open = new Set([key(startGx, startGz)]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[key(startGx, startGz), 0]]);

    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    while (open.size > 0) {
      let current = '';
      let lowest = Infinity;
      for (const k of open) {
        const score = gScore.get(k) ?? Infinity;
        if (score < lowest) {
          lowest = score;
          current = k;
        }
      }

      const [cgx, cgz] = current.split(',').map(Number);
      if (cgx === endGx && cgz === endGz) {
        const path: [number, number][] = [[cgx, cgz]];
        let ck = current;
        while (cameFrom.has(ck)) {
          ck = cameFrom.get(ck)!;
          const [gx, gz] = ck.split(',').map(Number);
          path.unshift([gx, gz]);
        }
        return path;
      }

      open.delete(current);
      for (const [dx, dz] of neighbors) {
        const ngx = cgx + dx;
        const ngz = cgz + dz;
        if (!this.isGridWalkable(ngx, ngz)) continue;

        const nk = key(ngx, ngz);
        const tentative = (gScore.get(current) ?? Infinity) + Math.hypot(dx, dz);
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentative);
          open.add(nk);
        }
      }
    }

    return [];
  }
}

function nearestPointOnSegment(pos: Vec3, segment: AiRoadSegment): NearestRoadResult {
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
    y: 0.1,
    z: a.z + t * dz,
  };
  const ddx = pos.x - point.x;
  const ddz = pos.z - point.z;
  const dist = Math.sqrt(ddx * ddx + ddz * ddz);
  return { segment, t, point, dist };
}

function sampleSegment(points: Vec3[], t: number): Vec3 {
  if (points.length < 2) return points[0] ?? vec3();
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
