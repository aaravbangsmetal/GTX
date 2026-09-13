import { vec3 } from './math';
import type { Vec3 } from './types';

export const PHYSICS_TICK_RATE = 60;
export const MAX_DELTA_TIME = 0.05;
export const WORLD_SIZE = 2000;
export const CHUNK_SIZE = 128;
export const CHUNK_LOAD_RADIUS = 3;
export const CHUNK_UNLOAD_RADIUS = 4;
export const PLAYER_SPAWN: Vec3 = vec3(200, 2, -150);
export const MAX_DRAW_CALLS = 500;
export const MAX_TRIANGLES = 2_000_000;
export const DAY_LENGTH_MINUTES = 24;
export const WANTED_MAX_LEVEL = 5;
export const MAX_TRAFFIC_VEHICLES = 15;
export const MAX_PEDESTRIANS = 20;
export const INTERACTION_RADIUS = 3;
export const VEHICLE_ENTER_RADIUS = 4;
