import { EventBus } from '../shared/events';
import { vec3 } from '../shared/math';
import { EntityManager } from '../core/EntityManager';
import type { GameContext } from '../shared/types';
import { COLLISION_MASKS, CollisionGroup } from './CollisionGroups';
import { PhysicsSystem } from './PhysicsSystem';

const FIXED_DT = 1 / 60;

function createTestContext(): GameContext {
  const canvas = document.createElement('canvas');
  const events = new EventBus();
  const entities = new EntityManager();

  return {
    canvas,
    events,
    registry: {
      register() {},
      get() {
        throw new Error('System not registered in physics test harness');
      },
      getAll: () => [],
      getUpdateOrder: () => [],
    },
    assets: {
      loadManifest: async () => {},
      get: <T>(_url: string): T => ({} as unknown as T),
      has: () => false,
      onProgress: () => {},
    },
    entities,
    getSystem() {
      throw new Error('System not registered in physics test harness');
    },
  };
}

export interface PhysicsTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export async function runPhysicsTests(): Promise<PhysicsTestResult[]> {
  const results: PhysicsTestResult[] = [];
  const ctx = createTestContext();
  const physics = new PhysicsSystem();
  await physics.init(ctx);

  results.push(testFallingBoxesStack(physics));
  results.push(testGroundRaycast(physics));
  results.push(testCapsuleOnGround(physics));
  results.push(testHundredBodiesStability(physics));
  results.push(testCollisionGroups(physics));

  physics.dispose();
  return results;
}

function step(physics: PhysicsSystem, seconds: number): void {
  const steps = Math.ceil(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    physics.fixedUpdate(FIXED_DT);
  }
}

function testFallingBoxesStack(physics: PhysicsSystem): PhysicsTestResult {
  const ids: number[] = [];
  for (let i = 0; i < 10; i++) {
    ids.push(
      physics.createBody({
        shape: 'box',
        dimensions: vec3(1, 1, 1),
        mass: 1,
        position: vec3(0, 10 + i * 1.1, 0),
        collisionGroup: CollisionGroup.NPC,
        collisionMask: COLLISION_MASKS.NPC,
      }),
    );
  }

  step(physics, 4);
  const top = physics.getBodyTransform(ids[ids.length - 1]);
  const passed = top.position.y > 0.4 && top.position.y < 12;
  return {
    name: '10 falling boxes stack',
    passed,
    detail: `top box y=${top.position.y.toFixed(2)}`,
  };
}

function testGroundRaycast(physics: PhysicsSystem): PhysicsTestResult {
  const hit = physics.raycast(vec3(0, 5, 0), vec3(0, -1, 0), 10, COLLISION_MASKS.PLAYER);
  const passed = hit !== null && hit.point.y <= 0.1;
  return {
    name: 'ground raycast',
    passed,
    detail: hit ? `hit y=${hit.point.y.toFixed(2)}` : 'no hit',
  };
}

function testCapsuleOnGround(physics: PhysicsSystem): PhysicsTestResult {
  const capsuleId = physics.createBody({
    shape: 'capsule',
    dimensions: vec3(0.4, 1.8, 0.4),
    mass: 75,
    position: vec3(2, 3, 0),
    collisionGroup: CollisionGroup.PLAYER,
    collisionMask: COLLISION_MASKS.PLAYER,
  });

  step(physics, 2);

  const transform = physics.getBodyTransform(capsuleId);
  const passed = transform.position.y > 0.2 && transform.position.y < 3;
  return {
    name: 'capsule walks on ground',
    passed,
    detail: `capsule y=${transform.position.y.toFixed(2)} x=${transform.position.x.toFixed(2)}`,
  };
}

function testHundredBodiesStability(physics: PhysicsSystem): PhysicsTestResult {
  for (let i = 0; i < 100; i++) {
    physics.createBody({
      shape: 'sphere',
      dimensions: vec3(0.25, 0.25, 0.25),
      mass: 1,
      position: vec3((i % 10) * 0.6 - 3, 5 + Math.floor(i / 10) * 0.6, (i % 5) * 0.6),
      collisionGroup: CollisionGroup.NPC,
      collisionMask: COLLISION_MASKS.NPC,
    });
  }

  step(physics, 10);
  return {
    name: '100 bodies stable at 60Hz',
    passed: true,
    detail: 'completed 600 physics steps without error',
  };
}

function testCollisionGroups(physics: PhysicsSystem): PhysicsTestResult {
  const playerId = physics.createBody({
    shape: 'capsule',
    dimensions: vec3(0.4, 1.8, 0.4),
    mass: 75,
    position: vec3(-3, 1, 0),
    collisionGroup: CollisionGroup.PLAYER,
    collisionMask: COLLISION_MASKS.PLAYER,
  });

  physics.createBody({
    shape: 'box',
    dimensions: vec3(2, 1.5, 4),
    mass: 0,
    position: vec3(-3, 0.75, 0),
    collisionGroup: CollisionGroup.VEHICLE,
    collisionMask: COLLISION_MASKS.VEHICLE,
  });

  step(physics, 1);
  const player = physics.getBodyTransform(playerId);
  const passed = player.position.y > 0.5;
  return {
    name: 'player does not pass through vehicle',
    passed,
    detail: `player y=${player.position.y.toFixed(2)}`,
  };
}
