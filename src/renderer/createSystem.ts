import type { GameContext, System } from '../shared/types';
import { RendererSystem } from './RendererSystem';

export function createRendererSystem(_ctx: GameContext): System {
  return new RendererSystem();
}
