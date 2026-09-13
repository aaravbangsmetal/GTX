import { DistrictId } from '../shared/types';
import { vec3 } from '../shared/math';
import type { RoadSegment } from './types';

function road(
  id: string,
  lanes: number,
  width: number,
  speedLimit: number,
  district: DistrictId,
  points: Array<[number, number]>,
): RoadSegment {
  return {
    id,
    type: 'boulevard',
    lanes,
    width,
    speedLimit,
    district,
    hasSidewalk: true,
    points: points.map(([x, z]) => vec3(x, 0, z)),
  };
}

export const BOULEVARD_ROADS: RoadSegment[] = [
  road('blvd_ocean', 4, 14, 50, DistrictId.OCEAN_BEACH, [[0, -500], [0, 500]]),
  road('blvd_downtown', 4, 14, 50, DistrictId.DOWNTOWN, [[-400, 0], [200, 0]]),
  road('blvd_havana', 4, 14, 50, DistrictId.LITTLE_HAVANA, [[-400, -200], [-400, 400]]),
  road('blvd_coast', 4, 14, 50, DistrictId.OCEAN_BEACH, [[200, -500], [200, 500]]),
  road('blvd_port', 4, 14, 50, DistrictId.VICE_PORT, [[-600, -200], [0, -200]]),
  road('blvd_island', 4, 14, 50, DistrictId.STARFISH_ISLAND, [[-200, 400], [600, 400]]),
];
