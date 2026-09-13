/**
 * Augments ShaderPass with the `name` field used by renderer passes.
 * Keeps the project buildable without cross-agent edits to src/renderer/.
 */
declare module 'three/addons/postprocessing/ShaderPass.js' {
  import { ShaderPass as BaseShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

  export class ShaderPass extends BaseShaderPass {
    name: string;
  }
}
