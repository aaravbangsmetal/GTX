import { DistrictId } from '../shared/types';
import { vec3 } from '../shared/math';
import type { RoadSegment } from './types';

function street(
  id: string,
  district: DistrictId,
  points: Array<[number, number]>,
): RoadSegment {
  return {
    id,
    type: 'street',
    lanes: 2,
    width: 8,
    speedLimit: 40,
    district,
    hasSidewalk: true,
    points: points.map(([x, z]) => vec3(x, 0, z)),
  };
}

function alley(id: string, district: DistrictId, points: Array<[number, number]>): RoadSegment {
  return {
    id,
    type: 'alley',
    lanes: 1,
    width: 5,
    speedLimit: 25,
    district,
    hasSidewalk: false,
    points: points.map(([x, z]) => vec3(x, 0, z)),
  };
}

export const STREET_ROADS: RoadSegment[] = [
  street('st_dt_1', DistrictId.DOWNTOWN, [[-300, -100], [-100, -100]]),
  street('st_dt_2', DistrictId.DOWNTOWN, [[-100, -100], [100, -100]]),
  street('st_dt_3', DistrictId.DOWNTOWN, [[-300, 100], [-100, 100]]),
  street('st_dt_4', DistrictId.DOWNTOWN, [[-100, 100], [100, 100]]),
  street('st_dt_5', DistrictId.DOWNTOWN, [[-100, -100], [-100, 300]]),
  street('st_dt_6', DistrictId.DOWNTOWN, [[100, -100], [100, 300]]),
  street('st_dt_7', DistrictId.DOWNTOWN, [[-300, 200], [100, 200]]),
  street('st_dt_8', DistrictId.DOWNTOWN, [[-200, -100], [-200, 300]]),
  street('st_ob_1', DistrictId.OCEAN_BEACH, [[400, -400], [400, 400]]),
  street('st_ob_2', DistrictId.OCEAN_BEACH, [[600, -400], [600, 400]]),
  street('st_ob_3', DistrictId.OCEAN_BEACH, [[400, -200], [800, -200]]),
  street('st_ob_4', DistrictId.OCEAN_BEACH, [[400, 0], [800, 0]]),
  street('st_ob_5', DistrictId.OCEAN_BEACH, [[400, 200], [800, 200]]),
  street('st_ob_6', DistrictId.OCEAN_BEACH, [[100, -300], [100, 300]]),
  street('st_lh_1', DistrictId.LITTLE_HAVANA, [[-800, 0], [-500, 0]]),
  street('st_lh_2', DistrictId.LITTLE_HAVANA, [[-800, 150], [-500, 150]]),
  street('st_lh_3', DistrictId.LITTLE_HAVANA, [[-800, -100], [-500, -100]]),
  street('st_lh_4', DistrictId.LITTLE_HAVANA, [[-700, -100], [-700, 300]]),
  street('st_lh_5', DistrictId.LITTLE_HAVANA, [[-600, -100], [-600, 300]]),
  street('st_lh_6', DistrictId.LITTLE_HAVANA, [[-900, 250], [-450, 250]]),
  street('st_vp_1', DistrictId.VICE_PORT, [[-800, -600], [-200, -600]]),
  street('st_vp_2', DistrictId.VICE_PORT, [[-800, -800], [-200, -800]]),
  street('st_vp_3', DistrictId.VICE_PORT, [[-500, -800], [-500, -400]]),
  street('st_vp_4', DistrictId.VICE_PORT, [[-300, -800], [-300, -400]]),
  alley('st_vp_5', DistrictId.VICE_PORT, [[-700, -500], [-400, -500]]),
  alley('st_vp_6', DistrictId.VICE_PORT, [[-600, -700], [-600, -450]]),
  street('st_si_1', DistrictId.STARFISH_ISLAND, [[0, 500], [800, 500]]),
  street('st_si_2', DistrictId.STARFISH_ISLAND, [[0, 700], [800, 700]]),
  street('st_si_3', DistrictId.STARFISH_ISLAND, [[200, 450], [200, 900]]),
  street('st_si_4', DistrictId.STARFISH_ISLAND, [[500, 450], [500, 900]]),
  street('st_conn_1', DistrictId.DOWNTOWN, [[-400, 0], [-400, 200]]),
  street('st_conn_2', DistrictId.OCEAN_BEACH, [[0, 0], [200, 0]]),
  street('st_conn_3', DistrictId.STARFISH_ISLAND, [[100, 400], [100, 600]]),
  street('st_conn_4', DistrictId.LITTLE_HAVANA, [[-400, 0], [-400, 100]]),
];
