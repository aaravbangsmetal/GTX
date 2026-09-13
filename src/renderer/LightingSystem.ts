import * as THREE from 'three';
import type { RendererDayNightState } from './types';

export class LightingSystem {
  private sun: THREE.DirectionalLight;
  private moon: THREE.DirectionalLight;
  private hemisphere: THREE.HemisphereLight;
  private streetLamps: THREE.InstancedMesh | null = null;
  private streetLampLights: THREE.PointLight[] = [];
  private readonly container = new THREE.Group();

  constructor() {
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;

    this.moon = new THREE.DirectionalLight(0x8899ff, 0);
    this.moon.castShadow = false;

    this.hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x362312, 0.5);
  }

  init(scene: THREE.Scene): void {
    this.container.add(this.hemisphere);
    this.container.add(this.sun);
    this.container.add(this.moon);
    this.container.add(this.sun.target);
    this.container.add(this.moon.target);
    scene.add(this.container);

    this.sun.position.set(50, 80, 30);
    this.sun.target.position.set(0, 0, 0);

    this.moon.position.set(-50, 60, -30);
    this.moon.target.position.set(0, 0, 0);

    this.createStreetLamps();
  }

  private createStreetLamps(): void {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const count = 5;
    this.streetLamps = new THREE.InstancedMesh(poleGeo, poleMat, count);

    const matrix = new THREE.Matrix4();
    const positions = [
      [-30, 0, -20],
      [-10, 0, -20],
      [10, 0, -20],
      [30, 0, -20],
      [50, 0, -20],
    ];

    for (let i = 0; i < count; i++) {
      const [x, y, z] = positions[i];
      matrix.setPosition(x, y + 3, z);
      this.streetLamps.setMatrixAt(i, matrix);

      const light = new THREE.PointLight(0xffaa55, 0, 25, 2);
      light.position.set(x, y + 6, z);
      this.streetLampLights.push(light);
      this.container.add(light);
    }

    this.streetLamps.instanceMatrix.needsUpdate = true;
    this.container.add(this.streetLamps);
  }

  getSun(): THREE.DirectionalLight {
    return this.sun;
  }

  update(state: RendererDayNightState): void {
    const sunX = Math.cos(state.sunAngle) * 100;
    const sunY = Math.sin(state.sunAngle) * 100;
    this.sun.position.set(sunX, Math.max(sunY, -20), 30);
    this.sun.color.copy(state.sunColor);
    this.sun.intensity = state.isNight ? 0.05 : state.ambientIntensity * 1.5;

    this.moon.position.set(-sunX, Math.max(-sunY, 20), -30);
    this.moon.intensity = state.isNight ? 0.15 : 0;

    const { top, bottom } = state.skyColors;
    this.hemisphere.color.set(top);
    this.hemisphere.groundColor.set(bottom);
    this.hemisphere.intensity = state.ambientIntensity;

    const lampIntensity = state.isNight ? 1.2 : 0;
    for (const light of this.streetLampLights) {
      light.intensity = lampIntensity;
    }
  }

  dispose(): void {
    this.streetLamps?.geometry.dispose();
    (this.streetLamps?.material as THREE.Material)?.dispose();
    for (const light of this.streetLampLights) {
      this.container.remove(light);
    }
  }
}
