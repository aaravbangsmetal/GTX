import type { EventBus } from '../shared/events';
import type { EntityId } from '../shared/types';
import { forgetNpcType, getNpcType, trackNpcType } from './player-bridge';
import type { WantedSystem } from './WantedSystem';

const PEDESTRIAN_HIT_SPEED_KMH = 20;

export class CrimeDetector {
  private npcTypes = new Map<EntityId, string>();
  private handlers: Array<{ event: keyof import('../shared/events').EventMap; handler: (...args: never[]) => void }> = [];

  constructor(
    private wanted: WantedSystem,
    private events: EventBus,
  ) {}

  init(): void {
    this.bind('ai:npcSpawn', ({ npcId, type }) => {
      trackNpcType(this.npcTypes, npcId, type);
    });

    this.bind('ai:npcDeath', ({ npcId }) => {
      forgetNpcType(this.npcTypes, npcId);
    });

    this.bind('combat:hit', ({ targetId }) => {
      const npcType = getNpcType(this.npcTypes, targetId);
      if (!npcType) return;
      this.wanted.markCrimeCommitted();
      if (npcType.includes('police')) {
        this.wanted.addStar(2);
      } else {
        this.wanted.addStar(1);
      }
    });

    this.bind('player:enterVehicle', () => {
      this.wanted.markCrimeCommitted();
      this.wanted.addStar(1);
    });

    this.bind('physics:collision', ({ impulse }) => {
      if (impulse < 8) return;
      this.wanted.markCrimeCommitted();
      this.wanted.addStar(1);
    });

    this.bind('vehicle:speedChange', ({ speedKmh }) => {
      if (speedKmh > PEDESTRIAN_HIT_SPEED_KMH) {
        this.wanted.markCrimeCommitted();
      }
    });
  }

  dispose(): void {
    for (const { event, handler } of this.handlers) {
      this.events.off(event, handler as never);
    }
    this.handlers = [];
    this.npcTypes.clear();
  }

  getNpcTypes(): ReadonlyMap<EntityId, string> {
    return this.npcTypes;
  }

  private bind<K extends keyof import('../shared/events').EventMap>(
    event: K,
    handler: (payload: import('../shared/events').EventMap[K]) => void,
  ): void {
    this.events.on(event, handler);
    this.handlers.push({ event, handler: handler as (...args: never[]) => void });
  }
}
