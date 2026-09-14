import { createAISystem } from '../ai';
import { createAudioSystem } from '../audio';
import { createGameplaySystem } from '../gameplay';
import { createPhysicsSystem } from '../physics';
import { createPlayerSystem } from '../player';
import { createRendererSystem } from '../renderer';
import { EventBus } from '../shared/events';
import { logger } from '../shared/logger';
import type { GameContext } from '../shared/types';
import { GameState } from '../shared/types';
import { createUISystem } from '../ui';
import { createVehicleSystem } from '../vehicles';
import { createWorldSystem } from '../world';
import { AssetLoader } from './AssetLoader';
import { createCoreSystem } from './createSystem';
import { DevOverlay } from './DevOverlay';
import { EntityManager } from './EntityManager';
import { GameLoop } from './GameLoop';
import { StateManager } from './StateManager';
import { SystemRegistry } from './SystemRegistry';

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
    this.registry.register(createRendererSystem(this.ctx));
    this.registry.register(createWorldSystem(this.ctx));
    this.registry.register(createPhysicsSystem(this.ctx));
    this.registry.register(createPlayerSystem(this.ctx));
    this.registry.register(createVehicleSystem(this.ctx));
    this.registry.register(createAISystem(this.ctx));
    this.registry.register(createAudioSystem(this.ctx));
    this.registry.register(createUISystem(this.ctx));
    this.registry.register(createGameplaySystem(this.ctx));

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
        let drawCalls = 0;
        let triangles = 0;
        try {
          const renderer = this.registry.get('renderer');
          if (renderer && 'getStats' in renderer) {
            const stats = (renderer as { getStats(): { drawCalls: number; triangles: number } }).getStats();
            drawCalls = stats.drawCalls;
            triangles = stats.triangles;
          }
        } catch {
          // Renderer not ready yet.
        }

        this.overlay.update({
          entities: this.entities.count(),
          drawCalls,
          triangles,
        });
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
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  private hideLoadingScreen(): void {
    const loading = document.getElementById('loading-screen');
    loading?.classList.add('hidden');
  }
}
