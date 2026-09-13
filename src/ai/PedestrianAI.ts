import { NPCBehaviorState } from './types';
import { action, condition, selector, sequence, type BTContext, type BTNode, type BTStatus } from './BehaviorTree';

export function createPedestrianBehaviorTree(): BTNode {
  return selector([
    sequence([
      condition((ctx) => ctx.npc.state === NPCBehaviorState.DEAD),
      action(() => 'success'),
    ]),
    sequence([
      condition((ctx) => ctx.playerDist < ctx.npc.config.fleeDistance),
      action((ctx) => {
        ctx.npc.fleeFrom(ctx.playerPos);
        const dest = ctx.pedPathfinder.getRandomWalkablePoint(ctx.npc.position, 30);
        ctx.npc.path = ctx.pedPathfinder.findPath(ctx.npc.position, dest);
        return 'success';
      }),
    ]),
    sequence([
      condition((ctx) => ctx.npc.path.length > 0),
      action(walkAlongPath),
    ]),
    action(pickRandomDestination),
  ]);
}

function walkAlongPath(ctx: BTContext): BTStatus {
  if (ctx.npc.pathIndex >= ctx.npc.path.length) {
    ctx.npc.path = [];
    ctx.npc.pathIndex = 0;
    return 'failure';
  }
  return 'running';
}

function pickRandomDestination(ctx: BTContext): BTStatus {
  const dest = ctx.pedPathfinder.getRandomWalkablePoint(ctx.npc.position, 50);
  ctx.npc.path = ctx.pedPathfinder.findPath(ctx.npc.position, dest);
  ctx.npc.pathIndex = 0;
  ctx.npc.state = NPCBehaviorState.WALKING;
  return 'success';
}
