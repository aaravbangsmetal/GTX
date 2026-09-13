import { DistrictId } from '../shared/types';
import { DISTRICT_DEFINITIONS } from './District';
import type { BuildingPlot, BuildingStyle, DistrictConfig, RoadSegment } from './types';

const ROAD_BUFFER = 12;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function distToSegment(px: number, pz: number, road: RoadSegment): number {
  const [a, b] = road.points;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const ddx = px - a.x;
    const ddz = pz - a.z;
    return Math.sqrt(ddx * ddx + ddz * ddz);
  }
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / lenSq));
  const nx = a.x + t * dx;
  const nz = a.z + t * dz;
  const ddx = px - nx;
  const ddz = pz - nz;
  return Math.sqrt(ddx * ddx + ddz * ddz);
}

function nearRoad(x: number, z: number, width: number, depth: number, roads: RoadSegment[]): boolean {
  const cx = x + width / 2;
  const cz = z + depth / 2;
  for (const road of roads) {
    const halfWidth = road.width / 2 + ROAD_BUFFER;
    if (distToSegment(cx, cz, road) < halfWidth) {
      return true;
    }
  }
  return false;
}

function pickStyle(config: DistrictConfig, rand: () => number): BuildingStyle {
  const idx = Math.floor(rand() * config.styles.length);
  return config.styles[idx];
}

function targetCount(config: DistrictConfig): number {
  const area =
    (config.bounds.maxX - config.bounds.minX) * (config.bounds.maxZ - config.bounds.minZ);
  const cellArea = 35 * 35;
  return Math.round((area / cellArea) * config.buildingDensity * 0.18);
}

export function generateBuildingPlots(roads: RoadSegment[]): BuildingPlot[] {
  const plots: BuildingPlot[] = [];
  let plotIndex = 0;

  for (const district of DISTRICT_DEFINITIONS) {
    const count = targetCount(district);
    const rand = seededRandom(district.id * 7919 + 42);
    const { bounds, maxFloors } = district;
    const cellW = 28 + Math.floor(rand() * 8);
    const cellD = 24 + Math.floor(rand() * 8);

    let placed = 0;
    for (let x = bounds.minX + 10; x < bounds.maxX - cellW && placed < count; x += cellW + 4) {
      for (let z = bounds.minZ + 10; z < bounds.maxZ - cellD && placed < count; z += cellD + 4) {
        if (rand() > district.buildingDensity) continue;
        if (nearRoad(x, z, cellW, cellD, roads)) continue;

        const floors = Math.max(1, Math.min(maxFloors, 1 + Math.floor(rand() * maxFloors)));
        plots.push({
          id: `bld_${district.id}_${plotIndex++}`,
          rect: { x, z, width: cellW, depth: cellD },
          floors,
          style: pickStyle(district, rand),
          colorIndex: Math.floor(rand() * 6),
          district: district.id,
          rotation: Math.floor(rand() * 4) * (Math.PI / 2),
        });
        placed++;
      }
    }
  }

  return plots;
}

export const DISTRICT_BUILDING_TARGETS: Record<DistrictId, number> = {
  [DistrictId.OCEAN_BEACH]: 40,
  [DistrictId.DOWNTOWN]: 60,
  [DistrictId.LITTLE_HAVANA]: 50,
  [DistrictId.VICE_PORT]: 20,
  [DistrictId.STARFISH_ISLAND]: 15,
};
