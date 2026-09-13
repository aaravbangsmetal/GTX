import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  type Object3D,
} from 'three';
import type { Vec3 } from '../shared/types';
import { nearestPointOnRoad, sampleSpline, splineTangent } from './geometry-utils';
import type { MapData } from './types';
import type { Intersection, NearestRoadResult, RoadNetworkData, RoadSegment } from './types';
import type { WorldMaterials } from './WorldMaterials';

const SEGMENTS_PER_ROAD = 16;
const SIDEWALK_WIDTH = 2;
const SIDEWALK_HEIGHT = 0.15;

export class RoadNetwork {
  private segments: RoadSegment[];
  private intersections: Intersection[];
  private graph = new Map<string, string[]>();

  constructor(mapData: MapData) {
    this.segments = mapData.roads;
    this.intersections = mapData.intersections;
    this.buildGraph();
  }

  private buildGraph(): void {
    for (const seg of this.segments) {
      if (!this.graph.has(seg.id)) {
        this.graph.set(seg.id, []);
      }
    }
    for (const inter of this.intersections) {
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

  getData(): RoadNetworkData {
    const sidewalks = this.segments
      .filter((s) => s.hasSidewalk)
      .flatMap((s) => this.generateSidewalkPolylines(s));

    return {
      segments: this.segments,
      intersections: this.intersections,
      sidewalks,
      getNearestRoad: (pos) => this.getNearestRoad(pos),
      getPath: (from, to) => this.getPath(from, to),
    };
  }

  getSegments(): RoadSegment[] {
    return this.segments;
  }

  getIntersections(): Intersection[] {
    return this.intersections;
  }

  generateRoadMesh(segment: RoadSegment, materials: WorldMaterials): Group {
    const group = new Group();
    group.name = `road_${segment.id}`;

    const roadMesh = this.createRoadStrip(segment, materials);
    group.add(roadMesh);

    if (segment.hasSidewalk) {
      const swWidth = segment.type === 'street' ? 1.5 : SIDEWALK_WIDTH;
      group.add(this.createSidewalk(segment, materials, swWidth, 1));
      group.add(this.createSidewalk(segment, materials, swWidth, -1));
    }

    group.add(this.createLaneMarkings(segment, materials));

    return group;
  }

  generateCrosswalk(intersection: Intersection, materials: WorldMaterials): Group {
    const group = new Group();
    group.name = `crosswalk_${intersection.id}`;
    const stripeW = 0.4;
    const stripeGap = 0.4;
    const crossLen = 6;

    for (let i = -3; i <= 3; i++) {
      const stripe = new Mesh(
        new BoxGeometry(stripeW, 0.02, crossLen),
        materials.markingWhite(),
      );
      stripe.position.set(intersection.position.x + i * (stripeW + stripeGap), 0.03, intersection.position.z);
      group.add(stripe);
    }

    if (intersection.hasTrafficLight) {
      const pole = new Mesh(new BoxGeometry(0.15, 4, 0.15), materials.asphalt());
      pole.position.set(intersection.position.x + 3, 2, intersection.position.z + 3);
      group.add(pole);
      const light = new Mesh(new BoxGeometry(0.3, 0.5, 0.3), materials.neon('#FF0000'));
      light.position.set(intersection.position.x + 3, 4, intersection.position.z + 3);
      group.add(light);
    }

    return group;
  }

  getNearestRoad(pos: Vec3): NearestRoadResult {
    let best: NearestRoadResult | null = null;
    let bestDist = Infinity;

    for (const segment of this.segments) {
      const { t, point, dist } = nearestPointOnRoad(pos, segment);
      if (dist < bestDist) {
        bestDist = dist;
        best = { segment, t, point };
      }
    }

    return best ?? { segment: this.segments[0], t: 0, point: { x: 0, y: 0, z: 0 } };
  }

  getPath(from: Vec3, to: Vec3): Vec3[] {
    const start = this.getNearestRoad(from);
    const end = this.getNearestRoad(to);
    const pathIds = this.aStar(start.segment.id, end.segment.id);

    const points: Vec3[] = [from];
    for (const id of pathIds) {
      const seg = this.segments.find((s) => s.id === id);
      if (seg) {
        points.push(...seg.points);
      }
    }
    points.push(to);
    return points;
  }

  getLanePosition(segmentId: string, t: number, lane: number): Vec3 {
    const segment = this.segments.find((s) => s.id === segmentId);
    if (!segment) return { x: 0, y: 0, z: 0 };
    const center = sampleSpline(segment.points, t);
    const tangent = splineTangent(segment.points, t);
    const laneOffset = (lane - (segment.lanes - 1) / 2) * 3.5;
    return {
      x: center.x - tangent.z * laneOffset,
      y: center.y,
      z: center.z + tangent.x * laneOffset,
    };
  }

  getRoadsInChunk(cx: number, cz: number, chunkSize = 128): RoadSegment[] {
    const minX = cx * chunkSize;
    const maxX = minX + chunkSize;
    const minZ = cz * chunkSize;
    const maxZ = minZ + chunkSize;

    return this.segments.filter((seg) => {
      for (const p of seg.points) {
        if (p.x >= minX && p.x < maxX && p.z >= minZ && p.z < maxZ) return true;
      }
      const [a, b] = seg.points;
      return (
        (a.x >= minX && a.x < maxX && a.z >= minZ && a.z < maxZ) ||
        (b.x >= minX && b.x < maxX && b.z >= minZ && b.z < maxZ)
      );
    });
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

  private createRoadStrip(segment: RoadSegment, materials: WorldMaterials): Mesh {
    const geometry = this.buildStripGeometry(segment, segment.width / 2);
    return new Mesh(geometry, materials.asphalt());
  }

  private createSidewalk(
    segment: RoadSegment,
    materials: WorldMaterials,
    width: number,
    side: 1 | -1,
  ): Mesh {
    const offset = segment.width / 2 + width / 2;
    const geometry = this.buildStripGeometry(segment, offset, width);
    const mesh = new Mesh(geometry, materials.sidewalk());
    mesh.position.y = SIDEWALK_HEIGHT;
    if (side === -1) {
      mesh.scale.z = -1;
    }
    return mesh;
  }

  private buildStripGeometry(
    segment: RoadSegment,
    halfWidth: number,
    stripWidth?: number,
  ): BufferGeometry {
    const hw = stripWidth ? stripWidth / 2 : halfWidth;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS_PER_ROAD; i++) {
      const t = i / SEGMENTS_PER_ROAD;
      const center = sampleSpline(segment.points, t);
      const tangent = splineTangent(segment.points, t);
      const nx = -tangent.z;
      const nz = tangent.x;

      const left = { x: center.x - nx * hw, z: center.z - nz * hw };
      const right = { x: center.x + nx * hw, z: center.z + nz * hw };

      positions.push(left.x, 0.01, left.z, right.x, 0.01, right.z);

      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createLaneMarkings(segment: RoadSegment, materials: WorldMaterials): Group {
    const group = new Group();
    if (segment.lanes < 2) return group;

    const dashCount = SEGMENTS_PER_ROAD * 2;
    for (let i = 0; i < dashCount; i += 2) {
      const t = i / dashCount;
      const center = sampleSpline(segment.points, t);
      const tangent = splineTangent(segment.points, t);
      const dash = new Mesh(
        new BoxGeometry(0.15, 0.02, 2),
        materials.markingWhite(),
      );
      dash.position.set(center.x, 0.02, center.z);
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
      group.add(dash);
    }

    const edgeT = 0.1;
    for (const t of [edgeT, 1 - edgeT]) {
      const center = sampleSpline(segment.points, t);
      const tangent = splineTangent(segment.points, t);
      const nx = -tangent.z;
      const nz = tangent.x;
      const offset = segment.width / 2 - 0.3;
      const edge = new Mesh(
        new BoxGeometry(0.1, 0.02, segment.points.length > 2 ? 8 : 20),
        materials.markingYellow(),
      );
      edge.position.set(center.x + nx * offset, 0.02, center.z + nz * offset);
      edge.rotation.y = Math.atan2(tangent.x, tangent.z);
      group.add(edge);
    }

    return group;
  }

  private generateSidewalkPolylines(segment: RoadSegment): Vec3[][] {
    const left: Vec3[] = [];
    const right: Vec3[] = [];
    const swOffset = segment.width / 2 + (segment.type === 'street' ? 1.5 : SIDEWALK_WIDTH);

    for (let i = 0; i <= SEGMENTS_PER_ROAD; i++) {
      const t = i / SEGMENTS_PER_ROAD;
      const center = sampleSpline(segment.points, t);
      const tangent = splineTangent(segment.points, t);
      const nx = -tangent.z;
      const nz = tangent.x;
      left.push({ x: center.x - nx * swOffset, y: SIDEWALK_HEIGHT, z: center.z - nz * swOffset });
      right.push({ x: center.x + nx * swOffset, y: SIDEWALK_HEIGHT, z: center.z + nz * swOffset });
    }

    return [left, right];
  }
}

export function collectRoadMeshes(network: RoadNetwork, materials: WorldMaterials): Object3D[] {
  return network.getSegments().map((s) => network.generateRoadMesh(s, materials));
}
