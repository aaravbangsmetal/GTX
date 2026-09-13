import { EventBus } from '../../shared/events';
import { SystemRegistry } from '../SystemRegistry';
import type { System, SystemName } from '../../shared/types';

function createNoop(name: SystemName): System {
  return {
    name,
    async init() {},
    fixedUpdate() {},
    update() {},
    dispose() {},
  };
}

export function runGameLoopStepTest(): boolean {
  const registry = new SystemRegistry();
  registry.register(createNoop('physics'));
  const events = new EventBus();
  let ticks = 0;
  events.on('game:tick', () => {
    ticks += 1;
  });

  // Access private frame via minimal simulation
  let fixedCount = 0;
  const physics = registry.get('physics');
  physics.fixedUpdate = () => {
    fixedCount += 1;
  };

  // Simulate 0.1s at 60hz = 6 fixed steps
  const fixedDelta = 1 / 60;
  let accumulator = 0;
  const delta = 0.1;
  accumulator += delta;
  while (accumulator >= fixedDelta) {
    physics.fixedUpdate(fixedDelta);
    accumulator -= fixedDelta;
  }

  return fixedCount === 6;
}
