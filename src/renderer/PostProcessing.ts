import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createBloomPass } from './passes/BloomPass';
import { createColorGradePass, createViceCityLutTexture } from './passes/ColorGradePass';
import { createFilmGrainPass, createVignettePass } from './passes/VignetteGrainPasses';

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private grainPass: ShaderPass;
  private fxaaPass: ShaderPass;
  private enabled = true;
  private width = 1;
  private height = 1;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = createBloomPass(this.width, this.height, 0.3);
    this.composer.addPass(this.bloomPass);

    const lutTexture = createViceCityLutTexture();
    this.composer.addPass(createColorGradePass(lutTexture));
    this.composer.addPass(createVignettePass(0.3));

    const noiseTexture = this.createNoiseTexture();
    this.grainPass = createFilmGrainPass(noiseTexture, 0.05);
    this.composer.addPass(this.grainPass);

    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFxaaResolution(renderer);
    this.composer.addPass(this.fxaaPass);
  }

  private createNoiseTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size);
    for (let i = 0; i < size * size; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private updateFxaaResolution(renderer: THREE.WebGLRenderer): void {
    const pixelRatio = renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.set(
      1 / (this.width * pixelRatio),
      1 / (this.height * pixelRatio),
    );
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.enabled) return;

    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.scene = scene;
    renderPass.camera = camera;

    const grainUniforms = this.grainPass.uniforms as { time: { value: number } };
    grainUniforms.time.value = performance.now() * 0.001;

    this.composer.render();
  }

  renderDirect(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    renderer.render(scene, camera);
  }

  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.enabled = quality !== 'low';
    this.bloomPass.strength = quality === 'high' ? 0.5 : quality === 'medium' ? 0.3 : 0.1;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setSize(width: number, height: number, renderer: THREE.WebGLRenderer): void {
    this.width = width;
    this.height = height;
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
    this.updateFxaaResolution(renderer);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
