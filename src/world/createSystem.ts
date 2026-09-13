import type { GameContext, System } from '../shared/types';
import { WorldSystem } from './WorldSystem';

export function createWorldSystem(_ctx: GameContext): System {
  return new WorldSystem();
}
