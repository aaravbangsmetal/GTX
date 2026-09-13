import type { RoadSegment } from './types';
import { BOULEVARD_ROADS } from './map-data-boulevards';
import { HIGHWAY_ROADS } from './map-data-highways';
import { STREET_ROADS } from './map-data-streets';

export { HIGHWAY_ROADS, BOULEVARD_ROADS, STREET_ROADS };

export const ALL_ROADS: RoadSegment[] = [
  ...HIGHWAY_ROADS,
  ...BOULEVARD_ROADS,
  ...STREET_ROADS,
];
