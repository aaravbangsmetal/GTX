import * as THREE from 'three';
import type { DayNightState, IRendererService } from '../shared/services';
import type { GameContext, System } from '../shared/types';
import { CameraRig } from './CameraRig';
import { DayNightCycle } from './DayNightCycle';
import { LightingSystem } from './LightingSystem';
import { LODManager } from './LODManager';
import { MaterialLibrary } from './MaterialLibrary';
import { PostProcessing } from './PostProcessing';
import { SceneManager } from './SceneManager';
import { ShadowSystem } from './ShadowSystem';
import { SkySystem } from './SkySystem';
import { buildTestScene } from './TestScene';
import { WaterSystem } from './WaterSystem';
import { createWebGLRenderer } from './WebGLSetup';
import { DEFAULT_RENDERER_CONFIG, RenderLayer, type RenderStats, type RendererDayNightState } from './types';

export class RendererSystem implements System, IRendererService {
  readonly name = 'renderer' as const;

  private renderer!: THREE.WebGLRenderer;
  private sceneManager!: SceneManager;
  private cameraRig!: CameraRig;
  private lighting!: LightingSystem;
  private sky!: SkySystem;
  private water!: WaterSystem;
  private postProcessing!: PostProcessing;
  private shadows!: ShadowSystem;
  private materials!: MaterialLibrary;
  private lod!: LODManager;
  private dayNight!: DayNightCycle;
  private paused = false;

  async init(ctx: GameContext): Promise<void> {

    this.renderer = createWebGLRenderer(ctx.canvas, DEFAULT_RENDERER_CONFIG);
    this.sceneManager = new SceneManager();
    this.cameraRig = new CameraRig();
    this.lighting = new LightingSystem();
    this.shadows = new ShadowSystem();
    this.materials = new MaterialLibrary();
    this.lod = new LODManager();
    this.dayNight = new DayNightCycle(ctx.events);

    this.lighting.init(this.sceneManager.scene);
    this.shadows.setupShadows(this.lighting.getSun(), DEFAULT_RENDERER_CONFIG.shadowMapSize);

    this.sky = new SkySystem(this.sceneManager.scene);
    this.water = new WaterSystem(this.sceneManager.scene);

    this.materials.init(ctx.events);
    buildTestScene(this.sceneManager, this.materials);

    this.postProcessing = new PostProcessing(
      this.renderer,
      this.sceneManager.scene,
      this.cameraRig.getCamera(),
    );

    const initialState = this.dayNight.getState();
    this.postProcessing.setBloomStrength(initialState.bloomStrength);
    this.updateFog(initialState);

    ctx.events.on('game:pause', () => {
      this.paused = true;
    });
    ctx.events.on('game:resume', () => {
      this.paused = false;
    });

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.setAspect(w, h);
    this.postProcessing.setSize(w, h, this.renderer);
  };

  fixedUpdate(_dt: number): void {}

  update(dt: number): void {
    if (this.paused) return;

    this.dayNight.update(dt);
    const state = this.dayNight.getState();

    this.sky.update(state);
    this.lighting.update(state);
    this.water.update(dt, state);
    this.shadows.updateCascades({
      x: this.cameraRig.getCamera().position.x,
      y: this.cameraRig.getCamera().position.y,
      z: this.cameraRig.getCamera().position.z,
    });
    this.lod.update({
      x: this.cameraRig.getCamera().position.x,
      y: this.cameraRig.getCamera().position.y,
      z: this.cameraRig.getCamera().position.z,
    });

    this.postProcessing.setBloomStrength(state.bloomStrength);
    this.updateFog(state);

    if (this.postProcessing.isEnabled()) {
      this.postProcessing.render(this.sceneManager.scene, this.cameraRig.getCamera());
    } else {
      this.postProcessing.renderDirect(this.renderer, this.sceneManager.scene, this.cameraRig.getCamera());
    }
  }

  private updateFog(state: RendererDayNightState): void {
    const fog = this.sceneManager.scene.fog as THREE.FogExp2;
    fog.color.set(state.skyColors.horizon);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.postProcessing.dispose();
    this.sky.dispose();
    this.water.dispose();
    this.lighting.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }

  getScene(): THREE.Scene {
    return this.sceneManager.scene;
  }

  getActiveCamera(): THREE.Camera {
    return this.cameraRig.getCamera();
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  addToScene(object: THREE.Object3D, layer: number = RenderLayer.WORLD): void {
    this.sceneManager.addToScene(object, layer as RenderLayer);
  }

  removeFromScene(object: THREE.Object3D): void {
    this.sceneManager.removeFromScene(object);
  }

  getMaterial(id: string): THREE.Material {
    return this.materials.get(id);
  }

  getDayNightState(): DayNightState {
    const state = this.dayNight.getState();
    return {
      hour: state.hour,
      sunAngle: state.sunAngle,
      isNight: state.isNight,
      bloomStrength: state.bloomStrength,
    };
  }

  getStats(): RenderStats {
    const info = this.renderer.info.render;
    return {
      drawCalls: info.calls,
      triangles: info.triangles,
      textures: this.renderer.info.memory.textures,
      geometries: this.renderer.info.memory.geometries,
    };
  }

  getCameraRig(): CameraRig {
    return this.cameraRig;
  }

  getLODManager(): LODManager {
    return this.lod;
  }
}
