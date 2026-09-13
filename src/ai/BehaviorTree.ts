import type { NPCBehaviorState, NPCConfig } from './types';
import type { PedestrianPathfinder } from './Pathfinder';
import type { Vec3 } from '../shared/types';

export type BTStatus = 'success' | 'failure' | 'running';

export interface BTNPC {
  state: NPCBehaviorState;
  config: NPCConfig;
  position: Vec3;
  path: Vec3[];
  pathIndex: number;
  fleeFrom(threatPos: Vec3): void;
}

export interface BTContext {
  npc: BTNPC;
  playerPos: { x: number; y: number; z: number };
  playerDist: number;
  wantedLevel: number;
  deltaTime: number;
  pedPathfinder: PedestrianPathfinder;
}

export interface BTAction {
  type: 'action';
  fn: (ctx: BTContext) => BTStatus;
}

export interface BTCondition {
  type: 'condition';
  fn: (ctx: BTContext) => boolean;
}

export interface BTSelector {
  type: 'selector';
  children: BTNode[];
}

export interface BTSequence {
  type: 'sequence';
  children: BTNode[];
}

export type BTNode = BTAction | BTCondition | BTSelector | BTSequence;

export function action(fn: (ctx: BTContext) => BTStatus): BTAction {
  return { type: 'action', fn };
}

export function condition(fn: (ctx: BTContext) => boolean): BTCondition {
  return { type: 'condition', fn };
}

export function selector(children: BTNode[]): BTSelector {
  return { type: 'selector', children };
}

export function sequence(children: BTNode[]): BTSequence {
  return { type: 'sequence', children };
}

export function tickTree(node: BTNode, ctx: BTContext): BTStatus {
  switch (node.type) {
    case 'selector':
      for (const child of node.children) {
        const status = tickTree(child, ctx);
        if (status === 'success' || status === 'running') {
          return status;
        }
      }
      return 'failure';

    case 'sequence':
      for (const child of node.children) {
        const status = tickTree(child, ctx);
        if (status === 'failure' || status === 'running') {
          return status;
        }
      }
      return 'success';

    case 'condition':
      return node.fn(ctx) ? 'success' : 'failure';

    case 'action':
      return node.fn(ctx);
  }
}
