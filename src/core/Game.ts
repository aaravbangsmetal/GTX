import { AssetLoader } from './AssetLoader';
import { createCoreSystem } from './createSystem';
import { DevOverlay } from './DevOverlay';
import { EntityManager } from './EntityManager';
import { GameLoop } from './GameLoop';
import { createStubSystem, STUB_SYSTEM_NAMES } from './stubs';
import { StateManager } from './StateManager';
import { SystemRegistry } from './SystemRegistry';
import { EventBus } from '../shared/events';
import { logger } from '../shared/logger';
import type { GameContext } from '../shared/types';
import { GameState } from '../shared/types';

export class Game {
  private events = new EventBus();
  private registry = new SystemRegistry();
  private assets = new AssetLoader();
  private entities = new EntityManager();
  private overlay = new DevOverlay();
  private state = new StateManager(this.events);
  private loop: GameLoop | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: GameContext | null = null;

  async init(): Promise<void> {
    this.events.emit('game:init', {});

    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
      throw new Error('Missing #app element');
    }

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'game-canvas';
      app.appendChild(this.canvas);
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.ctx = {
      canvas: this.canvas,
      events: this.events,
      registry: this.registry,
      assets: this.assets,
      entities: this.entities,
      getSystem: (name) => this.registry.get(name),
    };

    this.registry.register(createCoreSystem(this.overlay, this.state));

    for (const name of STUB_SYSTEM_NAMES) {
      this.registry.register(createStubSystem(name));
    }

    const systems = this.registry.getAll();
    for (const system of systems) {
      await system.init(this.ctx);
    }

    this.assets.onProgress((progress) => {
      const fill = document.getElementById('loading-fill');
      if (fill) {
        fill.style.width = `${progress.percent}%`;
      }
    });

    this.hideLoadingScreen();
    this.state.setState(GameState.PLAYING);
    this.events.emit('game:ready', {});

    this.loop = new GameLoop(this.registry, this.events, {
      onTick: () => {
        this.overlay.update({ entities: this.entities.count() });
      },
    });
    this.loop.start();

    logger.info('core', 'GTX engine started');
  }

  pause(): void {
    this.state.setState(GameState.PAUSED);
    this.events.emit('game:pause', {});
  }

  resume(): void {
    this.state.setState(GameState.PLAYING);
    this.events.emit('game:resume', {});
  }

  destroy(): void {
    this.loop?.stop();
    for (const system of this.registry.getAll()) {
      system.dispose();
    }
    this.events.clear();
    this.canvas?.remove();
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private hideLoadingScreen(): void {
    const loading = document.getElementById('loading-screen');
    loading?.classList.add('hidden');
  }
}
