import type { EntityId } from '../shared/types';

export class EntityManager {
  private nextId = 1;
  private components = new Map<string, Map<EntityId, unknown>>();
  private alive = new Set<EntityId>();

  createEntity(): EntityId {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    if (!this.alive.has(id)) return;
    this.alive.delete(id);
    for (const map of this.components.values()) {
      map.delete(id);
    }
  }

  addComponent<T>(id: EntityId, type: string, data: T): void {
    if (!this.alive.has(id)) return;
    const map = this.components.get(type) ?? new Map<EntityId, unknown>();
    map.set(id, data);
    this.components.set(type, map);
  }

  getComponent<T>(id: EntityId, type: string): T | undefined {
    return this.components.get(type)?.get(id) as T | undefined;
  }

  hasComponent(id: EntityId, type: string): boolean {
    return this.components.get(type)?.has(id) ?? false;
  }

  query(type: string): EntityId[] {
    const map = this.components.get(type);
    if (!map) return [];
    return [...map.keys()].filter((id) => this.alive.has(id));
  }

  count(): number {
    return this.alive.size;
  }
}
