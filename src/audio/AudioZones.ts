import { DistrictId } from '../shared/types';
import { AMBIENT_ZONES, TIME_AMBIENT_LAYERS } from './AudioConfig';
import type { AmbientZone } from './types';

export { AMBIENT_ZONES, TIME_AMBIENT_LAYERS };

const zoneByDistrict = new Map<DistrictId, AmbientZone>(
  AMBIENT_ZONES.map((zone) => [zone.district, zone]),
);

export function getAmbientZone(district: DistrictId): AmbientZone | undefined {
  return zoneByDistrict.get(district);
}
