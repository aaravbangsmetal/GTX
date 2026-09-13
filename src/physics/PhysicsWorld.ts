import * as CANNON from 'cannon-es';
import type { EntityId } from '../shared/types';
import { PHYSICS_TICK_RATE } from '../shared/constants';
import type { PhysicsConfig, ContactEvent } from './types';

export type ContactListener = (event: ContactEvent) => void;

export class PhysicsWorld {
  readonly world: CANNON.World;
  private readonly bodyEntityMap = new Map<number, EntityId>();
  private readonly entityBodyMap = new Map<EntityId, number>();
  private readonly bodies = new Map<number, CANNON.Body>();
  private readonly cannonToBodyId = new Map<number, number>();
  private nextBodyId = 1;
  private contactListener: ContactListener | null = null;
  private readonly processedContacts = new Set<string>();

  constructor(config: PhysicsConfig) {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(config.gravity.x, config.gravity.y, config.gravity.z),
      allowSleep: config.allowSleep,
    });

    if (config.broadphase === 'sap') {
      this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    } else {
      this.world.broadphase = new CANNON.NaiveBroadphase();
    }

    this.world.solver.iterations = config.solverIterations;
  }

  setContactListener(listener: ContactListener | null): void {
    this.contactListener = listener;
  }

  step(dt: number): void {
    const fixedDt = 1 / PHYSICS_TICK_RATE;
    this.world.step(fixedDt, dt, 3);
    this.emitSignificantCollisions();
  }

  addBody(body: CANNON.Body, entityId: EntityId): number {
    const bodyId = this.nextBodyId++;
    this.bodies.set(bodyId, body);
    this.bodyEntityMap.set(bodyId, entityId);
    this.entityBodyMap.set(entityId, bodyId);
    this.cannonToBodyId.set(body.id, bodyId);
    this.world.addBody(body);
    return bodyId;
  }

  removeBodyByEntity(entityId: EntityId): void {
    const bodyId = this.entityBodyMap.get(entityId);
    if (bodyId === undefined) return;
    this.removeBodyById(bodyId);
  }

  removeBodyById(bodyId: number): void {
    const body = this.bodies.get(bodyId);
    const entityId = this.bodyEntityMap.get(bodyId);
    if (!body) return;

    this.world.removeBody(body);
    this.bodies.delete(bodyId);
    this.bodyEntityMap.delete(bodyId);
    this.cannonToBodyId.delete(body.id);
    if (entityId !== undefined) {
      this.entityBodyMap.delete(entityId);
    }
  }

  getBody(bodyId: number): CANNON.Body {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Physics body ${bodyId} not found`);
    }
    return body;
  }

  getBodyByEntity(entityId: EntityId): CANNON.Body | undefined {
    const bodyId = this.entityBodyMap.get(entityId);
    return bodyId === undefined ? undefined : this.bodies.get(bodyId);
  }

  getBodyIdByCannonId(cannonId: number): number | undefined {
    return this.cannonToBodyId.get(cannonId);
  }

  getEntityId(bodyId: number): EntityId | undefined {
    return this.bodyEntityMap.get(bodyId);
  }

  getBodyEntityMap(): ReadonlyMap<number, EntityId> {
    return this.bodyEntityMap;
  }

  private emitSignificantCollisions(): void {
    if (!this.contactListener) return;

    for (const contact of this.world.contacts) {
      const bodyAId = this.cannonToBodyId.get(contact.bi.id);
      const bodyBId = this.cannonToBodyId.get(contact.bj.id);
      if (bodyAId === undefined || bodyBId === undefined) continue;

      const pairKey = `${bodyAId}:${bodyBId}:${contact.ni.x}:${contact.ni.y}:${contact.ni.z}`;
      if (this.processedContacts.has(pairKey)) continue;

      const impulse = Math.abs(contact.getImpactVelocityAlongNormal()) *
        (contact.bi.mass + contact.bj.mass);
      if (impulse <= 5) continue;

      this.processedContacts.add(pairKey);
      const entityA = this.bodyEntityMap.get(bodyAId) ?? 0;
      const entityB = this.bodyEntityMap.get(bodyBId) ?? 0;
      const point = {
        x: contact.bi.position.x + contact.ri.x,
        y: contact.bi.position.y + contact.ri.y,
        z: contact.bi.position.z + contact.ri.z,
      };

      this.contactListener({
        bodyA: bodyAId,
        bodyB: bodyBId,
        entityA,
        entityB,
        point,
        normal: { x: contact.ni.x, y: contact.ni.y, z: contact.ni.z },
        impulse,
      });
    }

    if (this.processedContacts.size > 256) {
      this.processedContacts.clear();
    }
  }
}
