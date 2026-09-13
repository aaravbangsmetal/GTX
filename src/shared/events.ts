import { logger } from './logger';
import type { DistrictId, EntityId, GameState, PlayerStateSnapshot, Vec3 } from './types';

export type EventMap = {
  'game:init': Record<string, never>;
  'game:ready': Record<string, never>;
  'game:tick': { delta: number; elapsed: number; fixedDelta: number };
  'game:stateChange': { from: GameState; to: GameState };
  'game:pause': Record<string, never>;
  'game:resume': Record<string, never>;
  'world:timeChange': { hour: number; isNight: boolean; sunAngle: number };
  'world:chunkLoaded': { chunkId: string; district: DistrictId };
  'world:chunkUnloaded': { chunkId: string };
  'world:playerDistrictChange': { district: DistrictId };
  'physics:bodyCreated': { entityId: EntityId; bodyId: number };
  'physics:collision': { entityA: EntityId; entityB: EntityId; point: Vec3; impulse: number };
  'player:spawn': { entityId: EntityId; position: Vec3 };
  'player:move': { position: Vec3; velocity: Vec3; isGrounded: boolean };
  'player:stateChange': { state: PlayerStateSnapshot };
  'player:death': { position: Vec3; cause: string };
  'player:enterVehicle': { playerId: EntityId; vehicleId: EntityId; seat: 'driver' | 'passenger' };
  'player:exitVehicle': { playerId: EntityId; vehicleId: EntityId; position: Vec3 };
  'player:interactPrompt': { text: string; targetId: EntityId | null };
  'vehicle:spawn': { vehicleId: EntityId; type: string; position: Vec3 };
  'vehicle:destroy': { vehicleId: EntityId };
  'vehicle:enginePitch': { vehicleId: EntityId; rpm: number; speed: number };
  'vehicle:speedChange': { vehicleId: EntityId; speedKmh: number };
  'ai:npcSpawn': { npcId: EntityId; type: string };
  'ai:npcDeath': { npcId: EntityId; position: Vec3 };
  'audio:volumeChange': { group: string; value: number };
  'ui:notification': { text: string; type: 'info' | 'success' | 'warning' | 'error'; duration: number };
  'mission:start': { missionId: string; title: string; objective: string };
  'mission:update': { missionId: string; progress: number; objective: string };
  'mission:complete': { missionId: string; reward: number };
  'mission:fail': { missionId: string; reason: string };
  'wanted:levelChange': { level: number; previousLevel: number };
  'combat:shoot': { origin: Vec3; direction: Vec3; weaponId: string };
  'combat:hit': { targetId: EntityId; damage: number; position: Vec3 };
  'pickup:collected': { type: string; value: number };
  'save:complete': { slot: number };
  'save:loaded': { slot: number };
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<keyof EventMap>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as Handler<keyof EventMap>);
    this.handlers.set(event, set);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler as Handler<keyof EventMap>);
  }

  once<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    const wrapper: Handler<K> = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    this.on(event, wrapper);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (error) {
        logger.error('events', `Handler failed for ${event}`, error);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
