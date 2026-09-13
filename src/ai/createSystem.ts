import type { GameContext, System } from '../shared/types';
import { AISystem } from './AISystem';

export function createAISystem(_ctx: GameContext): System {
  return new AISystem();
}
