import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import colorGradeFrag from '../shaders/colorGrade.frag?raw';

export function createColorGradePass(lutTexture: THREE.Texture): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      lutMap: { value: lutTexture },
      lutSize: { value: 16 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: colorGradeFrag,
  });
  pass.name = 'ColorGradePass';
  return pass;
}

export function createViceCityLutTexture(): THREE.DataTexture {
  const size = 16;
  const data = new Uint8Array(size * size * size * 4);

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const i = (b * size * size + g * size + r) * 4;
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);

        const tealShadow = 0.15 * (1 - rf);
        data[i] = Math.min(255, (rf * 255 + tealShadow * 30));
        data[i + 1] = Math.min(255, gf * 220 + tealShadow * 80);
        data[i + 2] = Math.min(255, bf * 200 + tealShadow * 60);
        data[i + 3] = 255;
      }
    }
  }

  const texture = new THREE.DataTexture(data, size * size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
