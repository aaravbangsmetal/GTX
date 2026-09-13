import type { GameContext, System } from '../shared/types';
import { UISystem } from './UISystem';

export function createUISystem(_ctx: GameContext): System {
  return new UISystem();
}
