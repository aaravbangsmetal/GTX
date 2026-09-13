import { EventBus } from '../../shared/events';

export function runEventBusTests(): boolean {
  const bus = new EventBus();
  let count = 0;

  const handler = () => {
    count += 1;
  };

  bus.on('game:ready', handler);
  bus.emit('game:ready', {});
  bus.off('game:ready', handler);
  bus.emit('game:ready', {});

  let onceCount = 0;
  bus.once('game:init', () => {
    onceCount += 1;
  });
  bus.emit('game:init', {});
  bus.emit('game:init', {});

  return count === 1 && onceCount === 1;
}
