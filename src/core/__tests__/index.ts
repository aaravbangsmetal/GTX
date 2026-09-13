import { runEventBusTests } from './EventBus.test';
import { runGameLoopStepTest } from './GameLoop.test';

export function runCoreTests(): void {
  const results = [
    ['EventBus', runEventBusTests()],
    ['GameLoop', runGameLoopStepTest()],
  ];

  for (const [name, passed] of results) {
    console.info(`[GTX:test] ${name}: ${passed ? 'PASS' : 'FAIL'}`);
  }
}
