import { DISTRICT_DEFINITIONS } from './District';
import type { MapData } from './types';
import type { MinimapData, Vec2 } from './types';
import type { RoadNetwork } from './RoadNetwork';

const ROAD_COLORS: Record<string, string> = {
  highway: '#888888',
  boulevard: '#FFFFFF',
  street: '#CCCCCC',
  alley: '#999999',
};

export class MinimapGenerator {
  generate(mapData: MapData, _roadNetwork: RoadNetwork): MinimapData {
    const roads = mapData.roads.map((seg) => ({
      points: seg.points.map((p) => ({ x: p.x, z: p.z })),
      width: seg.width,
      type: seg.type,
    }));

    const districts = DISTRICT_DEFINITIONS.map((d) => ({
      id: d.id,
      polygon: boundsToPolygon(d.bounds),
      color: d.color,
    }));

    const landmarks = [
      { id: 'spawn', position: { x: mapData.spawnPoints.player.x, z: mapData.spawnPoints.player.z }, label: 'Spawn' },
      { id: 'police', position: { x: mapData.spawnPoints.police_station.x, z: mapData.spawnPoints.police_station.z }, label: 'Police' },
      { id: 'hospital', position: { x: mapData.spawnPoints.hospital.x, z: mapData.spawnPoints.hospital.z }, label: 'Hospital' },
      { id: 'mission1', position: { x: mapData.spawnPoints.mission_1_target.x, z: mapData.spawnPoints.mission_1_target.z }, label: 'Mission 1' },
      { id: 'mission2', position: { x: mapData.spawnPoints.mission_2_area.x, z: mapData.spawnPoints.mission_2_area.z }, label: 'Mission 2' },
      { id: 'mission3_pickup', position: { x: mapData.spawnPoints.mission_3_pickup.x, z: mapData.spawnPoints.mission_3_pickup.z }, label: 'Port Pickup' },
      { id: 'mission3_delivery', position: { x: mapData.spawnPoints.mission_3_delivery.x, z: mapData.spawnPoints.mission_3_delivery.z }, label: 'Island Delivery' },
    ];

    const waterBoundary: Vec2[] = [
      { x: 800, z: -1000 },
      { x: 1000, z: -1000 },
      { x: 1000, z: 1000 },
      { x: 800, z: 1000 },
    ];

    return {
      width: 2000,
      height: 2000,
      roads,
      districts,
      landmarks,
      waterBoundary,
    };
  }

  getRoadColor(type: string): string {
    return ROAD_COLORS[type] ?? '#AAAAAA';
  }
}

function boundsToPolygon(bounds: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}): Vec2[] {
  return [
    { x: bounds.minX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.maxZ },
    { x: bounds.minX, z: bounds.maxZ },
  ];
}
