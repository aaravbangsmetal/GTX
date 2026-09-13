import { distance3 } from '../shared/math';
import type { MissionContext, MissionObjective } from './types';

export class MissionObjectiveChecker {
  check(objective: MissionObjective, ctx: MissionContext): boolean {
    if (objective.completed) return true;

    switch (objective.type) {
      case 'reach':
        return this.checkReach(objective, ctx);
      case 'kill':
        return this.checkKill(objective, ctx);
      case 'collect':
        return this.checkCollect(objective, ctx);
      case 'deliver':
        return this.checkDeliver(objective, ctx);
      case 'survive':
        return ctx.elapsed >= (objective.timeLimit ?? 0) && !ctx.playerDead;
      case 'timer':
        return ctx.elapsed <= (objective.timeLimit ?? Infinity);
      default:
        return false;
    }
  }

  private checkReach(objective: MissionObjective, ctx: MissionContext): boolean {
    if (objective.id === 'enter-vehicle') {
      return ctx.isInVehicle;
    }
    if (!objective.position || !objective.radius) return false;
    return distance3(ctx.playerPos, objective.position) <= objective.radius;
  }

  private checkKill(objective: MissionObjective, ctx: MissionContext): boolean {
    const target = objective.target ?? 'any';
    const count = objective.count ?? 1;
    return (ctx.kills[target] ?? 0) >= count;
  }

  private checkCollect(objective: MissionObjective, ctx: MissionContext): boolean {
    const target = objective.target ?? 'item';
    const count = objective.count ?? 1;

    if (objective.position && objective.radius) {
      const inRange = distance3(ctx.playerPos, objective.position) <= objective.radius;
      if (inRange) {
        ctx.collected[target] = (ctx.collected[target] ?? 0) + 1;
      }
    }

    return (ctx.collected[target] ?? 0) >= count;
  }

  private checkDeliver(objective: MissionObjective, ctx: MissionContext): boolean {
    if (!ctx.carryingPackage) return false;
    if (!objective.position || !objective.radius) return false;
    return distance3(ctx.playerPos, objective.position) <= objective.radius;
  }
}

export function createMissionContext(): MissionContext {
  return {
    playerPos: { x: 0, y: 0, z: 0 },
    playerVehicle: null,
    isInVehicle: false,
    kills: {},
    collected: {},
    elapsed: 0,
    playerDead: false,
    carryingPackage: false,
    missionStartTime: performance.now() / 1000,
  };
}
