import * as THREE from 'three';
import waterVert from './shaders/water.vert?raw';
import waterFrag from './shaders/water.frag?raw';
import type { RendererDayNightState } from './types';

export class WaterSystem {
  private mesh: THREE.Mesh;
  private uniforms: {
    time: { value: number };
    waterColor: { value: THREE.Color };
    sunDirection: { value: THREE.Vector3 };
    reflectivity: { value: number };
  };
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.uniforms = {
      time: { value: 0 },
      waterColor: { value: new THREE.Color(0x1a5276) },
      sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
      reflectivity: { value: 0.4 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.PlaneGeometry(2000, 2000, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(1000, 0, 0);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  update(dt: number, state: RendererDayNightState): void {
    this.elapsed += dt;
    this.uniforms.time.value = this.elapsed;

    const sunX = Math.cos(state.sunAngle);
    const sunY = Math.sin(state.sunAngle);
    this.uniforms.sunDirection.value.set(sunX, sunY, 0.3).normalize();

    const waterColor = state.isNight ? 0x0a2540 : 0x1a5276;
    this.uniforms.waterColor.value.set(waterColor);

    const sunsetFactor = 1 - Math.abs(state.hour - 18) / 6;
    this.uniforms.reflectivity.value = 0.3 + Math.max(0, sunsetFactor) * 0.4;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
