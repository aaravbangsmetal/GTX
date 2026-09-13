import { PLAYER_SPAWN } from '../shared/constants';
import type { IPhysicsService, IPlayerService, IRendererService } from '../shared/services';
import type { GameContext, PlayerStateSnapshot, Vec3 } from '../shared/types';
import { createMockPhysicsService } from './__mocks__/MockPhysicsService';
import { createMockPlayerService } from './__mocks__/MockPlayerService';

export function resolvePhysics(ctx: GameContext): IPhysicsService {
  const sys = ctx.getSystem('physics') as unknown as Partial<IPhysicsService>;
  if (typeof sys.raycast === 'function') {
    return sys as IPhysicsService;
  }
  return createMockPhysicsService();
}

export function resolveRenderer(ctx: GameContext): IRendererService | null {
  const sys = ctx.getSystem('renderer') as unknown as Partial<IRendererService>;
  if (typeof sys.addToScene === 'function') {
    return sys as IRendererService;
  }
  return null;
}

export function resolvePlayer(ctx: GameContext): IPlayerService {
  const sys = ctx.getSystem('player') as unknown as Partial<IPlayerService>;
  if (typeof sys.getPosition === 'function') {
    return sys as IPlayerService;
  }
  return createMockPlayerService();
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
