import type { Vec3 } from '../shared/types';
import type { EventBus, EventMap } from '../shared/events';
import type { PedestrianPathfinder } from './Pathfinder';
import type { PoliceAI } from './PoliceAI';
import type { SpawnManager } from './SpawnManager';
import {
  COLLISION_FLEE_RADIUS,
  COLLISION_IMPULSE_THRESHOLD,
  HORN_SCATTER_RADIUS,
  SHOOT_FLEE_RADIUS,
} from './types';

export class ReactionSystem {
  private handlers: Array<{ event: keyof EventMap; handler: (...args: never[]) => void }> = [];
  private getPlayerPos: () => Vec3 = () => ({ x: 0, y: 0, z: 0 });

  constructor(
    private spawnManager: SpawnManager,
    private pedPathfinder: PedestrianPathfinder,
    private policeAI: PoliceAI,
    private events: EventBus,
  ) {}

  init(getPlayerPos: () => Vec3): void {
    this.getPlayerPos = getPlayerPos;

    this.bind('combat:shoot', (payload) => {
      this.spawnManager.fleeNPCsInRadius(payload.origin, SHOOT_FLEE_RADIUS, this.pedPathfinder);
    });

    this.bind('physics:collision', (payload) => {
      if (payload.impulse < COLLISION_IMPULSE_THRESHOLD) return;
      this.spawnManager.fleeNPCsInRadius(payload.point, COLLISION_FLEE_RADIUS, this.pedPathfinder);
    });

    this.bind('player:move', (payload) => {
      const speed = Math.hypot(payload.velocity.x, payload.velocity.y, payload.velocity.z);
      if (speed < 10) return;
      this.spawnManager.fleeNPCsInRadius(payload.position, 12, this.pedPathfinder);
    });

    this.bind('wanted:levelChange', (payload) => {
      this.policeAI.onWantedLevelChange(payload.level, this.getPlayerPos());
    });

    this.bind('combat:hit', (payload) => {
      const npc = this.spawnManager.getNPC(payload.targetId);
      if (npc) {
        npc.takeDamage(payload.damage);
      }
    });
  }

  scatterFromHorn(position: Vec3): void {
    this.spawnManager.fleeNPCsInRadius(position, HORN_SCATTER_RADIUS, this.pedPathfinder);
  }

  private bind<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void,
  ): void {
    this.events.on(event, handler);
    this.handlers.push({ event, handler: handler as (...args: never[]) => void });
  }

  dispose(): void {
    for (const { event, handler } of this.handlers) {
      this.events.off(event, handler as (payload: EventMap[typeof event]) => void);
    }
    this.handlers = [];
  }
}
