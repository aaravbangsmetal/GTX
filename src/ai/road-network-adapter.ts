import type { RoadNetworkData } from '../shared/services';
import type { AiIntersection, AiRoadNetworkData, AiRoadSegment } from './types';

export function adaptRoadNetwork(data: RoadNetworkData): AiRoadNetworkData {
  const segments = (data.segments as AiRoadSegment[]) ?? [];
  const rawIntersections = (data.intersections as Array<{
    id: string;
    position: { x: number; y: number; z: number };
    connectedRoads: string[];
    hasTrafficLight: boolean;
    type: 'cross' | 't' | 'roundabout';
  }>) ?? [];

  const intersections: AiIntersection[] = rawIntersections.map((inter) => ({
    ...inter,
    orientation: inferOrientation(inter.connectedRoads, segments),
  }));

  return { segments, intersections };
}

function inferOrientation(
  connectedRoads: string[],
  segments: AiRoadSegment[],
): 'ns' | 'ew' {
  for (const roadId of connectedRoads) {
    const seg = segments.find((s) => s.id === roadId);
    if (!seg || seg.points.length < 2) continue;
    const [a, b] = seg.points;
    const dx = Math.abs(b.x - a.x);
    const dz = Math.abs(b.z - a.z);
    if (dz > dx) return 'ns';
    if (dx > dz) return 'ew';
  }
  return 'ns';
}
