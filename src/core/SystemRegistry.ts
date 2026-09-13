import type { ISystemRegistry, System, SystemName } from '../shared/types';

const FIXED_ORDER: SystemName[] = ['physics', 'player', 'vehicles', 'ai', 'gameplay'];
const VARIABLE_ORDER: SystemName[] = [
  'world', 'player', 'vehicles', 'ai', 'gameplay', 'audio', 'ui', 'renderer',
];

export class SystemRegistry implements ISystemRegistry {
  private systems = new Map<SystemName, System>();

  register(system: System): void {
    if (this.systems.has(system.name)) {
      throw new Error(`System already registered: ${system.name}`);
    }
    this.systems.set(system.name, system);
  }

  get<T extends System>(name: SystemName): T {
    const system = this.systems.get(name);
    if (!system) {
      throw new Error(`System not found: ${name}`);
    }
    return system as T;
  }

  getAll(): System[] {
    return [...this.systems.values()];
  }

  getUpdateOrder(): SystemName[] {
    return [...FIXED_ORDER, ...VARIABLE_ORDER];
  }

  getFixedUpdateSystems(): System[] {
    return FIXED_ORDER.map((name) => this.systems.get(name)).filter(Boolean) as System[];
  }

  getVariableUpdateSystems(): System[] {
    return VARIABLE_ORDER.map((name) => this.systems.get(name)).filter(Boolean) as System[];
  }
}
