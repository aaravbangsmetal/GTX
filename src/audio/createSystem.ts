import type { GameContext, System } from '../shared/types';
import { AudioSystem } from './AudioSystem';

export function createAudioSystem(_ctx: GameContext): System {
  return new AudioSystem();
}
