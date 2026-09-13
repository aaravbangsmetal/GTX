import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import vignetteFrag from '../shaders/vignette.frag?raw';
import filmGrainFrag from '../shaders/filmGrain.frag?raw';
import type * as THREE from 'three';

export function createVignettePass(strength = 0.3): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      strength: { value: strength },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: vignetteFrag,
  });
  pass.name = 'VignettePass';
  return pass;
}

export function createFilmGrainPass(noiseTexture: THREE.Texture, strength = 0.05): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      noiseMap: { value: noiseTexture },
      strength: { value: strength },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: filmGrainFrag,
  });
  pass.name = 'FilmGrainPass';
  return pass;
}
