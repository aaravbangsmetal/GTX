import { DistrictId } from '../../shared/types';
import { vec3 } from '../../shared/math';
import type { IWorldService, RoadNetworkData } from '../../shared/services';
import type { Vec3 } from '../../shared/types';

const MOCK_SEGMENTS = [
  {
    id: 'blvd_downtown',
    type: 'boulevard' as const,
    lanes: 4,
    points: [vec3(-400, 0, 0), vec3(200, 0, 0)],
    width: 14,
    hasSidewalk: true,
    speedLimit: 50,
  },
  {
    id: 'blvd_ocean',
    type: 'boulevard' as const,
    lanes: 4,
    points: [vec3(0, 0, -500), vec3(0, 0, 500)],
    width: 14,
    hasSidewalk: true,
    speedLimit: 50,
  },
];

const MOCK_INTERSECTIONS = [
  {
    id: 'int_ocean_downtown',
    position: vec3(0, 0, 0),
    connectedRoads: ['blvd_ocean', 'blvd_downtown'],
    hasTrafficLight: true,
    type: 'cross' as const,
  },
];

export class MockWorldService implements IWorldService {
  getRoadNetwork(): RoadNetworkData {
    return {
      segments: MOCK_SEGMENTS,
      intersections: MOCK_INTERSECTIONS,
    };
  }

  getMinimapData() {
    return { width: 2000, height: 2000, roads: [], districts: [], landmarks: [], waterBoundary: [] };
  }

  getDistrictAt(_position: Vec3): number {
    return DistrictId.DOWNTOWN;
  }

  getSpawnPoint(_id: string): Vec3 {
    return vec3(200, 2, -150);
  }

  getCollisionData(chunkId: string) {
    return { chunkId, vertices: new Float32Array(0), indices: new Uint32Array(0) };
  }
}
