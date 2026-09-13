import * as THREE from 'three';
import skyVert from './shaders/sky.vert?raw';
import skyFrag from './shaders/sky.frag?raw';
import type { RendererDayNightState } from './types';

export class SkySystem {
  private mesh: THREE.Mesh;
  private uniforms: {
    topColor: { value: THREE.Color };
    bottomColor: { value: THREE.Color };
    horizonColor: { value: THREE.Color };
    sunAngle: { value: number };
    dayMix: { value: number };
  };

  constructor(scene: THREE.Scene) {
    this.uniforms = {
      topColor: { value: new THREE.Color(0x7b4fbf) },
      bottomColor: { value: new THREE.Color(0xff6b9d) },
      horizonColor: { value: new THREE.Color(0xff8c42) },
      sunAngle: { value: 0 },
      dayMix: { value: 0.5 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const geometry = new THREE.SphereGeometry(900, 32, 16);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  update(state: RendererDayNightState): void {
    this.uniforms.topColor.value.set(state.skyColors.top);
    this.uniforms.bottomColor.value.set(state.skyColors.bottom);
    this.uniforms.horizonColor.value.set(state.skyColors.horizon);
    this.uniforms.sunAngle.value = state.sunAngle;
    this.uniforms.dayMix.value = state.isNight ? 0.1 : Math.min(state.ambientIntensity + 0.2, 1.0);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
