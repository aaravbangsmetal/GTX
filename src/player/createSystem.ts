import type { GameContext, System } from '../shared/types';
import { PlayerSystem } from './PlayerSystem';

export function createPlayerSystem(_ctx: GameContext): System {
  return new PlayerSystem();
}
