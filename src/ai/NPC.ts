import { distance3, normalize3, vec3 } from '../shared/math';
import type { EntityId, Vec3 } from '../shared/types';
import type { IPhysicsService } from '../shared/services';
import type { EventBus } from '../shared/events';
import { tickTree, type BTContext, type BTNode } from './BehaviorTree';
import { NPCModel } from './NPCModel';
import { NPCBehaviorState, type NPCConfig } from './types';

export class NPC {
  readonly entityId: EntityId;
  readonly config: NPCConfig;
  readonly model: NPCModel;

  state: NPCBehaviorState = NPCBehaviorState.IDLE;
  health: number;
  position: Vec3;
  targetPosition: Vec3 | null = null;
  path: Vec3[] = [];
  pathIndex = 0;
  bodyId: number;

  private physics: IPhysicsService;
  private behaviorTree: BTNode;
  private events: EventBus;
  private deathTimer = 0;

  constructor(
    entityId: EntityId,
    config: NPCConfig,
    position: Vec3,
    physics: IPhysicsService,
    behaviorTree: BTNode,
    events: EventBus,
  ) {
    this.entityId = entityId;
    this.config = config;
    this.position = { ...position };
    this.health = config.health;
    this.physics = physics;
    this.behaviorTree = behaviorTree;
    this.events = events;
    this.model = new NPCModel();

    this.bodyId = physics.createBody({
      shape: 'capsule',
      dimensions: vec3(0.3, 0.9, 0.3),
      mass: 70,
      position: { ...position },
      collisionGroup: 0x0004,
      collisionMask: 0xffff,
    });
  }

  async initModel(): Promise<void> {
    await this.model.load(this.config.type, { loadManifest: async () => {}, get: () => null as never, has: () => false, onProgress: () => {} });
    this.model.setPosition(this.position.x, this.position.y, this.position.z);
  }

  update(dt: number, ctx: Omit<BTContext, 'npc'>): void {
    if (this.state === NPCBehaviorState.DEAD) {
      this.deathTimer += dt;
      return;
    }

    const fullCtx: BTContext = { ...ctx, npc: this };
    tickTree(this.behaviorTree, fullCtx);

    if (this.state === NPCBehaviorState.WALKING || this.state === NPCBehaviorState.FLEEING) {
      this.moveAlongPath(dt);
    } else {
      this.model.setAnimation('idle');
    }

    this.model.updateAnimation(dt);
    this.syncPhysics();
  }

  private moveAlongPath(dt: number): void {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.state = NPCBehaviorState.IDLE;
      this.path = [];
      this.pathIndex = 0;
      this.model.setAnimation('idle');
      return;
    }

    const target = this.path[this.pathIndex];
    const dir = normalize3({
      x: target.x - this.position.x,
      y: 0,
      z: target.z - this.position.z,
    });
    const dist = distance3(this.position, target);
    const speed = this.state === NPCBehaviorState.FLEEING ? this.config.runSpeed : this.config.walkSpeed;

    if (dist < 0.5) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.state = NPCBehaviorState.IDLE;
        this.path = [];
        this.pathIndex = 0;
        this.model.setAnimation('idle');
      }
      return;
    }

    const step = Math.min(speed * dt, dist);
    this.position.x += dir.x * step;
    this.position.y = target.y;
    this.position.z += dir.z * step;

    this.model.setAnimation(this.state === NPCBehaviorState.FLEEING ? 'run' : 'walk');
    this.model.setRotation(Math.atan2(dir.x, dir.z));
    this.model.setPosition(this.position.x, this.position.y, this.position.z);
  }

  private syncPhysics(): void {
    this.physics.setBodyTransform(this.bodyId, {
      position: { ...this.position },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: vec3(1, 1, 1),
    });
  }

  takeDamage(amount: number): void {
    if (this.state === NPCBehaviorState.DEAD) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    }
  }

  die(): void {
    this.state = NPCBehaviorState.DEAD;
    this.path = [];
    this.events.emit('ai:npcDeath', {
      npcId: this.entityId,
      position: { ...this.position },
    });
    this.model.setAnimation('idle');
  }

  shouldRemove(): boolean {
    return this.state === NPCBehaviorState.DEAD && this.deathTimer > 5;
  }

  fleeFrom(threatPos: Vec3): void {
    const away = normalize3({
      x: this.position.x - threatPos.x,
      y: 0,
      z: this.position.z - threatPos.z,
    });
    const fleeTarget = {
      x: this.position.x + away.x * 20,
      y: this.position.y,
      z: this.position.z + away.z * 20,
    };
    this.targetPosition = fleeTarget;
    this.state = NPCBehaviorState.FLEEING;
    this.pathIndex = 0;
  }

  dispose(): void {
    this.physics.removeBody(this.bodyId);
    this.model.dispose();
  }
}
