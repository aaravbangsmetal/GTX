import type { EventBus } from '../shared/events';
import { GameState } from '../shared/types';

export class StateManager {
  private state = GameState.LOADING;

  constructor(private events: EventBus) {}

  getState(): GameState {
    return this.state;
  }

  setState(next: GameState): void {
    if (this.state === next) return;
    const from = this.state;
    this.state = next;
    this.events.emit('game:stateChange', { from, to: next });
  }
}
