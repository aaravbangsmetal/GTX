import * as THREE from 'three';
import type { Vec3 } from '../shared/types';

export class ShadowSystem {
  setupShadows(sun: THREE.DirectionalLight, mapSize = 1024): void {
    sun.castShadow = true;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.bias = -0.001;
  }

  updateCascades(_cameraPos: Vec3): void {
    // v1: single shadow map; cascade upgrade deferred
  }
}
