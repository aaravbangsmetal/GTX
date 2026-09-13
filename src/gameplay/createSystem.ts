import type { GameContext, System } from '../shared/types';
import { GameplaySystem } from './GameplaySystem';

export function createGameplaySystem(_ctx: GameContext): System {
  return new GameplaySystem();
}
