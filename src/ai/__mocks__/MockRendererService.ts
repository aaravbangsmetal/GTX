import { Scene } from 'three';
import type { IRendererService } from '../../shared/services';

export class MockRendererService implements IRendererService {
  private scene = new Scene();

  getScene() {
    return this.scene;
  }

  getActiveCamera() {
    return this.scene.children[0] as never;
  }

  getRenderer() {
    return {} as never;
  }

  addToScene(object: import('three').Object3D): void {
    this.scene.add(object);
  }

  removeFromScene(object: import('three').Object3D): void {
    this.scene.remove(object);
  }

  getMaterial() {
    return {} as never;
  }

  getDayNightState() {
    return { hour: 12, sunAngle: 0, isNight: false, bloomStrength: 0 };
  }
}
