import type { GameContext } from '../shared/types';
import type { System } from '../shared/types';
import { PhysicsSystem } from './PhysicsSystem';

export function createPhysicsSystem(_ctx: GameContext): System {
  return new PhysicsSystem();
}
