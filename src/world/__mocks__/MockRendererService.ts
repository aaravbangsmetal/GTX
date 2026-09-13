import {
  Color,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Camera,
  type Material,
  type Object3D,
} from 'three';
import type { DayNightState, IRendererService } from '../../shared/services';

export class MockRendererService implements IRendererService {
  private scene = new Scene();
  private camera = new PerspectiveCamera(60, 1, 0.1, 5000);
  private renderer: WebGLRenderer | null = null;
  private materials = new Map<string, Material>();

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.renderer = new WebGLRenderer({ canvas, antialias: true });
    }
  }

  getScene(): Scene {
    return this.scene;
  }

  getActiveCamera(): Camera {
    return this.camera;
  }

  getRenderer(): WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new WebGLRenderer({ antialias: true });
    }
    return this.renderer;
  }

  addToScene(object: Object3D, _layer?: number): void {
    this.scene.add(object);
  }

  removeFromScene(object: Object3D): void {
    this.scene.remove(object);
  }

  getMaterial(id: string): Material {
    const existing = this.materials.get(id);
    if (existing) return existing;

    const mat = new MeshStandardMaterial({
      color: new Color(id.includes('neon') ? '#FF1493' : '#CCCCCC'),
      roughness: 0.8,
    });
    this.materials.set(id, mat);
    return mat;
  }

  getDayNightState(): DayNightState {
    return { hour: 18, sunAngle: 0.5, isNight: false, bloomStrength: 0.3 };
  }

  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
    this.renderer?.dispose();
  }
}
