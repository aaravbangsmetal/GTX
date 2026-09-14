import * as CANNON from 'cannon-es';
import type { IPhysicsService, IWorldService } from '../shared/services';
import type {
  BodyConfig,
  EntityId,
  GameContext,
  RaycastHit,
  System,
  Transform,
  Vec3,
} from '../shared/types';
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
  private readonly bodyIdToEntity = new Map<number, EntityId>();

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.physicsWorld = new PhysicsWorld({
      gravity: vec3(0, -9.82, 0),
      solverIterations: 10,
      broadphase: 'sap',
      allowSleep: true,
    });
    this.bodyMeshSync.setBodyResolver((bodyId) => {
      try {
        return this.physicsWorld.getBody(bodyId);
      } catch {
        return undefined;
      }
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
    this.bindChunkEvents();
    this.createGroundPlane();
  }

  fixedUpdate(dt: number): void {
    this.physicsWorld.step(dt);
    this.bodyMeshSync.sync();
  }

  update(_dt: number): void {}

  dispose(): void {
    if (this.groundBodyId !== null) {
      this.removeBody(this.groundBodyId);
      this.groundBodyId = null;
    }
  }

  createBody(config: BodyConfig): number {
    const entityId = this.ctx.entities.createEntity();
    let body;

    switch (config.shape) {
      case 'box':
        body = this.bodyFactory.createBox({
          dimensions: config.dimensions,
          mass: config.mass,
          position: config.position,
          group: config.collisionGroup,
          mask: config.collisionMask,
        });
        break;
      case 'sphere':
        body = this.bodyFactory.createSphere({
          radius: config.dimensions.x,
          mass: config.mass,
          position: config.position,
          group: config.collisionGroup,
          mask: config.collisionMask,
        });
        break;
      case 'capsule':
        body = this.bodyFactory.createCapsule({
          radius: config.dimensions.x,
          height: config.dimensions.y,
          mass: config.mass,
          position: config.position,
          group: config.collisionGroup,
          mask: config.collisionMask,
        });
        break;
      case 'trimesh':
        throw new Error('Trimesh bodies are created from world chunk collision data.');
      default:
        throw new Error(`Unsupported physics shape: ${config.shape as string}`);
    }

    const bodyId = this.physicsWorld.addBody(body, entityId);
    this.bodyIdToEntity.set(bodyId, entityId);
    this.ctx.events.emit('physics:bodyCreated', { entityId, bodyId });
    return bodyId;
  }

  removeBody(bodyId: number): void {
    const entityId = this.bodyIdToEntity.get(bodyId);
    if (entityId !== undefined) {
      this.ctx.entities.destroyEntity(entityId);
      this.bodyIdToEntity.delete(bodyId);
    }
    this.bodyMeshSync.unbind(bodyId);
    this.physicsWorld.removeBodyById(bodyId);
  }

  raycast(
    origin: Vec3,
    direction: Vec3,
    maxDist: number,
    mask?: number,
  ): RaycastHit | null {
    return this.raycaster.cast({
      origin,
      direction,
      maxDistance: maxDist,
      collisionMask: mask,
    });
  }

  getBodyTransform(bodyId: number): Transform {
    const body = this.physicsWorld.getBody(bodyId);
    return {
      position: {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z,
      },
      rotation: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
      scale: vec3(1, 1, 1),
    };
  }

  setBodyTransform(bodyId: number, transform: Transform): void {
    const body = this.physicsWorld.getBody(bodyId);
    body.position.set(transform.position.x, transform.position.y, transform.position.z);
    body.quaternion.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      transform.rotation.w,
    );
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.wakeUp();
  }

  getBodyMeshSync(): BodyMeshSync {
    return this.bodyMeshSync;
  }

  getConstraintManager(): ConstraintManager {
    return this.constraints;
  }

  private bindChunkEvents(): void {
    this.ctx.events.on('world:chunkLoaded', ({ chunkId }) => {
      try {
        const world = this.ctx.getSystem('world') as unknown as IWorldService;
        const data = world.getCollisionData(chunkId);
        this.trimeshBuilder.buildFromChunkData(data);
      } catch {
        // World service unavailable during standalone physics tests.
      }
    });

    this.ctx.events.on('world:chunkUnloaded', ({ chunkId }) => {
      this.trimeshBuilder.removeChunk(chunkId);
    });
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
    this.bodyIdToEntity.set(this.groundBodyId, entityId);
  }

  getEntityIdForBody(bodyId: number): EntityId | undefined {
    return this.bodyIdToEntity.get(bodyId);
  }

  getCannonBody(bodyId: number): CANNON.Body {
    return this.physicsWorld.getBody(bodyId);
  }

  getWorld(): CANNON.World {
    return this.physicsWorld.world;
  }

  step(_dt: number): void {
    // World stepping happens in fixedUpdate; vehicles share this world.
  }

  getBodyVelocity(bodyId: number): Vec3 {
    const body = this.physicsWorld.getBody(bodyId);
    return { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
  }

  setBodyVelocity(bodyId: number, velocity: Vec3): void {
    const body = this.physicsWorld.getBody(bodyId);
    body.velocity.set(velocity.x, velocity.y, velocity.z);
    body.wakeUp();
  }

  setBodyEnabled(bodyId: number, enabled: boolean): void {
    const body = this.physicsWorld.getBody(bodyId);
    if (enabled) {
      body.type = CANNON.Body.DYNAMIC;
      body.wakeUp();
      return;
    }

    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.type = CANNON.Body.KINEMATIC;
  }
}
