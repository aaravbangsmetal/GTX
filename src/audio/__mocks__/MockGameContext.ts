import { AssetLoader } from '../../core/AssetLoader';
import { EntityManager } from '../../core/EntityManager';
import { SystemRegistry } from '../../core/SystemRegistry';
import { EventBus } from '../../shared/events';
import { PLAYER_SPAWN } from '../../shared/constants';
import type { IPlayerService, IRendererService } from '../../shared/services';
import type { GameContext, System, Vec3 } from '../../shared/types';
import { PerspectiveCamera } from 'three';

class MockPlayerService implements IPlayerService {
  private position: Vec3 = { ...PLAYER_SPAWN };

  getState() {
    return {
      health: 100,
      armor: 0,
      money: 0,
      wantedLevel: 0,
      weaponId: null,
      position: { ...this.position },
      isInVehicle: false,
      vehicleId: null,
    };
  }

  getEntityId(): number {
    return 1;
  }

  getPosition(): Vec3 {
    return { ...this.position };
  }

  isControllable(): boolean {
    return true;
  }

  teleport(position: Vec3): void {
    this.position = { ...position };
  }
}

class MockRendererService implements IRendererService {
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 2000);

  getScene() {
    throw new Error('MockRendererService: scene not available');
  }

  getActiveCamera() {
    return this.camera;
  }

  getRenderer() {
    throw new Error('MockRendererService: renderer not available');
  }

  addToScene(): void {
    // noop
  }

  removeFromScene(): void {
    // noop
  }

  getMaterial() {
    throw new Error('MockRendererService: material not available');
  }

  getDayNightState() {
    return { hour: 18, sunAngle: 0.4, isNight: false, bloomStrength: 0.3 };
  }
}

class MockPlayerSystem implements System {
  readonly name = 'player' as const;
  private readonly service = new MockPlayerService();

  async init(): Promise<void> {
    // noop
  }

  fixedUpdate(): void {
    // noop
  }

  update(): void {
    // noop
  }

  dispose(): void {
    // noop
  }

  getPosition(): Vec3 {
    return this.service.getPosition();
  }
}

class MockRendererSystem implements System {
  readonly name = 'renderer' as const;
  private readonly service = new MockRendererService();

  async init(): Promise<void> {
    // noop
  }

  fixedUpdate(): void {
    // noop
  }

  update(): void {
    // noop
  }

  dispose(): void {
    // noop
  }

  getActiveCamera() {
    return this.service.getActiveCamera();
  }
}

export function createMockContext(): GameContext {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const registry = new SystemRegistry();
  const events = new EventBus();
  const assets = new AssetLoader();
  const entities = new EntityManager();

  registry.register(new MockPlayerSystem());
  registry.register(new MockRendererSystem());

  return {
    canvas,
    events,
    registry,
    assets,
    entities,
    getSystem: (name) => registry.get(name),
  };
}
