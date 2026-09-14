import { PLAYER_SPAWN } from '../shared/constants';
import type { IPhysicsService, IPlayerService, IRendererService } from '../shared/services';
import type { GameContext, PlayerStateSnapshot, Vec3 } from '../shared/types';

export function resolvePhysics(ctx: GameContext): IPhysicsService {
  return ctx.getSystem('physics') as unknown as IPhysicsService;
}

export function resolveRenderer(ctx: GameContext): IRendererService | null {
  return ctx.getSystem('renderer') as unknown as IRendererService;
}

export function resolvePlayer(ctx: GameContext): IPlayerService {
  return ctx.getSystem('player') as unknown as IPlayerService;
}

export function createFallbackPlayerState(): PlayerStateSnapshot {
  return {
    health: 100,
    armor: 0,
    money: 0,
    wantedLevel: 0,
    weaponId: null,
    position: { ...PLAYER_SPAWN },
    isInVehicle: false,
    vehicleId: null,
  };
}

export function getAimDirection(cameraYaw: number, pitch = 0): Vec3 {
  return {
    x: Math.sin(cameraYaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(cameraYaw) * Math.cos(pitch),
  };
}
