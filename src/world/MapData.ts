import { PLAYER_SPAWN } from '../shared/constants';
import { vec3 } from '../shared/math';
import { DISTRICT_DEFINITIONS } from './District';
import { generateBuildingPlots } from './building-plot-generator';
import { MAP_INTERSECTIONS } from './map-data-intersections';
import { ALL_ROADS } from './map-data-roads';
import type { MapData, SpawnPoints } from './types';

export const SPAWN_POINTS: SpawnPoints = {
  player: PLAYER_SPAWN,
  mission_1_target: vec3(-50, 2, 100),
  mission_2_area: vec3(-400, 2, 50),
  mission_3_pickup: vec3(-300, 2, -400),
  mission_3_delivery: vec3(100, 2, 600),
  police_station: vec3(-100, 2, 0),
  hospital: vec3(150, 2, -50),
};

const buildingPlots = generateBuildingPlots(ALL_ROADS);

export const MAP_DATA: MapData = {
  districts: DISTRICT_DEFINITIONS,
  roads: ALL_ROADS,
  intersections: MAP_INTERSECTIONS,
  spawnPoints: SPAWN_POINTS,
  buildingPlots,
};

export function getMapStats(): { buildings: number; roads: number; props: number } {
  return {
    buildings: MAP_DATA.buildingPlots.length,
    roads: MAP_DATA.roads.length,
    props: 0,
  };
}
