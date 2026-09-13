import * as THREE from 'three';
import type { RendererConfig } from './types';

export function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  config: RendererConfig,
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: config.antialias,
    powerPreference: 'high-performance',
  });

  const pixelRatio = Math.min(window.devicePixelRatio, config.pixelRatioMax);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return renderer;
}
