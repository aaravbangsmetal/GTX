import { logger } from '../shared/logger';
import type { System, SystemName } from '../shared/types';

export function createStubSystem(name: SystemName): System {
  return {
    name,
    async init() {
      logger.info(name, 'stub initialized');
    },
    fixedUpdate() {},
    update() {},
    dispose() {},
  };
}

export const STUB_SYSTEM_NAMES: SystemName[] = [
  'renderer',
  'world',
  'physics',
  'player',
  'vehicles',
  'ai',
  'audio',
  'ui',
  'gameplay',
];
