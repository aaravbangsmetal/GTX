import { AssetLoader } from '../../core/AssetLoader';
import { EntityManager } from '../../core/EntityManager';
import { SystemRegistry } from '../../core/SystemRegistry';
import { EventBus } from '../../shared/events';
import type { GameContext } from '../../shared/types';

export function createMockContext(): GameContext {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const registry = new SystemRegistry();
  const events = new EventBus();
  const assets = new AssetLoader();
  const entities = new EntityManager();

  return {
    canvas,
    events,
    registry,
    assets,
    entities,
    getSystem: (name) => registry.get(name),
  };
}
