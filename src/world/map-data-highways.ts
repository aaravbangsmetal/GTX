import { DistrictId } from '../shared/types';
import { vec3 } from '../shared/math';
import type { RoadSegment } from './types';

const HW = 900;

function road(
  id: string,
  type: RoadSegment['type'],
  lanes: number,
  width: number,
  speedLimit: number,
  district: DistrictId,
  points: Array<[number, number]>,
): RoadSegment {
  return {
    id,
    type,
    lanes,
    width,
    speedLimit,
    district,
    hasSidewalk: false,
    points: points.map(([x, z]) => vec3(x, 0, z)),
  };
}

export const HIGHWAY_ROADS: RoadSegment[] = [
  road('hwy_north', 'highway', 4, 16, 80, DistrictId.DOWNTOWN, [[-HW, HW], [HW, HW]]),
  road('hwy_south', 'highway', 4, 16, 80, DistrictId.VICE_PORT, [[-HW, -HW], [HW, -HW]]),
  road('hwy_east', 'highway', 4, 16, 80, DistrictId.OCEAN_BEACH, [[HW, -HW], [HW, HW]]),
  road('hwy_west', 'highway', 4, 16, 80, DistrictId.LITTLE_HAVANA, [[-HW, -HW], [-HW, HW]]),
];
