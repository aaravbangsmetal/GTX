declare module 'three/addons/postprocessing/ShaderPass.js' {
  import type { ShaderMaterial } from 'three';
  import type { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

  export class ShaderPass extends Pass {
    constructor(shader: object, textureID?: string);
    textureID: string;
    uniforms: Record<string, { value: unknown }>;
    material: ShaderMaterial;
    fsQuad: FullScreenQuad;
    name: string;
  }
}
