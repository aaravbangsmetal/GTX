import * as THREE from 'three';
import { RenderLayer } from './types';

export class SceneManager {
  readonly scene: THREE.Scene;
  private layers = new Map<RenderLayer, THREE.Group>();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xff6b9d, 0.0008);

    const layerValues = [
      RenderLayer.WORLD,
      RenderLayer.VEHICLE,
      RenderLayer.CHARACTER,
      RenderLayer.EFFECT,
      RenderLayer.UI_3D,
    ];

    for (const layer of layerValues) {
      const group = new THREE.Group();
      group.name = `layer_${layer}`;
      this.layers.set(layer, group);
      this.scene.add(group);
    }
  }

  addToLayer(object: THREE.Object3D, layer: RenderLayer): void {
    this.getLayer(layer).add(object);
  }

  removeFromLayer(object: THREE.Object3D, layer: RenderLayer): void {
    this.getLayer(layer).remove(object);
  }

  getLayer(layer: RenderLayer): THREE.Group {
    const group = this.layers.get(layer);
    if (!group) {
      throw new Error(`Unknown render layer: ${layer}`);
    }
    return group;
  }

  addToScene(object: THREE.Object3D, layer: RenderLayer = RenderLayer.WORLD): void {
    this.addToLayer(object, layer);
  }

  removeFromScene(object: THREE.Object3D): void {
    for (const group of this.layers.values()) {
      group.remove(object);
    }
  }
}
