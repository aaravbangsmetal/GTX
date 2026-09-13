import * as THREE from 'three';
import type { Vec3 } from '../shared/types';

export class CameraRig {
  private camera: THREE.PerspectiveCamera;

  constructor(aspect = window.innerWidth / window.innerHeight) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 20, 0);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  setAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setPosition(pos: Vec3): void {
    this.camera.position.set(pos.x, pos.y, pos.z);
  }

  lookAt(target: Vec3): void {
    this.camera.lookAt(target.x, target.y, target.z);
  }
}
