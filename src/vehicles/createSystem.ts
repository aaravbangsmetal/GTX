import type { GameContext, System } from '../shared/types';
import { VehicleSystem } from './VehicleSystem';

export function createVehicleSystem(_ctx: GameContext): System {
  return new VehicleSystem();
}
