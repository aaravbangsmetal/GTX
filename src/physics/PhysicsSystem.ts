import type { IPhysicsService } from '../shared/services';
import type { BodyConfig, GameContext, RaycastHit, System, Transform, Vec3 } from '../shared/types';
import { vec3 } from '../shared/math';
import { BodyFactory } from './BodyFactory';
import { BodyMeshSync } from './BodyMeshSync';
import { COLLISION_MASKS, CollisionGroup } from './CollisionGroups';
import { ConstraintManager } from './ConstraintManager';
import { PhysicsWorld } from './PhysicsWorld';
import { PhysicsRaycaster } from './Raycaster';
import { TrimeshBuilder } from './TrimeshBuilder';

export class PhysicsSystem implements System, IPhysicsService {
  readonly name = 'physics' as const;

  private ctx!: GameContext;
  private physicsWorld!: PhysicsWorld;
  private bodyFactory!: BodyFactory;
  private raycaster!: PhysicsRaycaster;
  private trimeshBuilder!: TrimeshBuilder;
  private bodyMeshSync = new BodyMeshSync();
  private constraints!: ConstraintManager;
  private groundBodyId: number | null = null;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.physicsWorld = new PhysicsWorld({
      gravity: vec3(0, -9.82, 0),
      solverIterations: 10,
      broadphase: 'sap',
      allowSleep: true,
    });
    this.bodyFactory = new BodyFactory(this.physicsWorld.world);
    this.raycaster = new PhysicsRaycaster(
      this.physicsWorld.world,
      this.physicsWorld.getBodyEntityMap(),
      this.physicsWorld.getCannonToBodyIdMap() as Map<number, number>,
    );
    this.trimeshBuilder = new TrimeshBuilder(this.physicsWorld);
    this.constraints = new ConstraintManager(this.physicsWorld.world);
    this.physicsWorld.setContactListener((event) => {
      this.ctx.events.emit('physics:collision', {
        entityA: event.entityA,
        entityB: event.entityB,
        point: event.point,
        impulse: event.impulse,
      });
    });
    this.createGroundPlane();
  }

  fixedUpdate(_dt: number): void {}

  update(_dt: number): void {}

  dispose(): void {
    if (this.groundBodyId !== null) {
      this.removeBody(this.groundBodyId);
      this.groundBodyId = null;
    }
  }

  createBody(_config: BodyConfig): number {
    return 0;
  }

  removeBody(_bodyId: number): void {}

  raycast(
    _origin: Vec3,
    _direction: Vec3,
    _maxDist: number,
    _mask?: number,
  ): RaycastHit | null {
    return null;
  }

  getBodyTransform(_bodyId: number): Transform {
    return {
      position: vec3(),
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: vec3(1, 1, 1),
    };
  }

  setBodyTransform(_bodyId: number, _transform: Transform): void {}

  getBodyMeshSync(): BodyMeshSync {
    return this.bodyMeshSync;
  }

  getConstraintManager(): ConstraintManager {
    return this.constraints;
  }

  private createGroundPlane(): void {
    const ground = this.bodyFactory.createBox({
      dimensions: vec3(2000, 0.1, 2000),
      mass: 0,
      position: vec3(0, -0.05, 0),
      group: CollisionGroup.STATIC,
      mask: COLLISION_MASKS.STATIC,
      material: 'foot-ground',
    });
    const entityId = this.ctx.entities.createEntity();
    this.groundBodyId = this.physicsWorld.addBody(ground, entityId);
  }
}
