import { DistrictId } from '../shared/types';
import type { DistrictBounds, DistrictConfig } from './types';

export const DISTRICT_COLORS: Record<DistrictId, string> = {
  [DistrictId.OCEAN_BEACH]: '#98D8C8',
  [DistrictId.DOWNTOWN]: '#FF7F7F',
  [DistrictId.LITTLE_HAVANA]: '#FF8C42',
  [DistrictId.VICE_PORT]: '#7B4FBF',
  [DistrictId.STARFISH_ISLAND]: '#FFF5E6',
};

export const DISTRICT_DEFINITIONS: DistrictConfig[] = [
  {
    id: DistrictId.OCEAN_BEACH,
    bounds: { minX: 0, maxX: 1000, minZ: -500, maxZ: 500 },
    buildingDensity: 0.4,
    maxFloors: 4,
    styles: ['motel', 'artdeco'],
    propDensity: 0.6,
    color: DISTRICT_COLORS[DistrictId.OCEAN_BEACH],
  },
  {
    id: DistrictId.DOWNTOWN,
    bounds: { minX: -400, maxX: 200, minZ: -200, maxZ: 400 },
    buildingDensity: 0.8,
    maxFloors: 12,
    styles: ['artdeco'],
    propDensity: 0.5,
    color: DISTRICT_COLORS[DistrictId.DOWNTOWN],
  },
  {
    id: DistrictId.LITTLE_HAVANA,
    bounds: { minX: -1000, maxX: -400, minZ: -200, maxZ: 400 },
    buildingDensity: 0.7,
    maxFloors: 4,
    styles: ['rowhouse'],
    propDensity: 0.55,
    color: DISTRICT_COLORS[DistrictId.LITTLE_HAVANA],
  },
  {
    id: DistrictId.VICE_PORT,
    bounds: { minX: -1000, maxX: 0, minZ: -1000, maxZ: -200 },
    buildingDensity: 0.3,
    maxFloors: 3,
    styles: ['warehouse'],
    propDensity: 0.4,
    color: DISTRICT_COLORS[DistrictId.VICE_PORT],
  },
  {
    id: DistrictId.STARFISH_ISLAND,
    bounds: { minX: -400, maxX: 1000, minZ: 400, maxZ: 1000 },
    buildingDensity: 0.25,
    maxFloors: 3,
    styles: ['mansion'],
    propDensity: 0.3,
    color: DISTRICT_COLORS[DistrictId.STARFISH_ISLAND],
  },
];

export function getDistrictAtPosition(x: number, z: number): DistrictId {
  for (const district of DISTRICT_DEFINITIONS) {
    const { bounds } = district;
    if (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ) {
      return district.id;
    }
  }
  return DistrictId.DOWNTOWN;
}

export function pointInBounds(x: number, z: number, bounds: DistrictBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

export function getDistrictConfig(id: DistrictId): DistrictConfig {
  const config = DISTRICT_DEFINITIONS.find((d) => d.id === id);
  if (!config) {
    return DISTRICT_DEFINITIONS[1];
  }
  return config;
}
