import type { System } from '../shared/types';
import { DevOverlay } from './DevOverlay';
import { StateManager } from './StateManager';
import { GameState } from '../shared/types';

export function createCoreSystem(overlay: DevOverlay, state: StateManager): System {
  return {
    name: 'core',
    async init() {
      state.setState(GameState.PLAYING);
    },
    fixedUpdate() {},
    update() {
      overlay.update({});
    },
    dispose() {
      overlay.dispose();
    },
  };
}
