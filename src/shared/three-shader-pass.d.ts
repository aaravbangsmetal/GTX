/**
 * Augments ShaderPass with the `name` field used by renderer passes.
 */
declare module 'three/addons/postprocessing/ShaderPass.js' {
  import { ShaderPass as BaseShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

  export class ShaderPass extends BaseShaderPass {
    name: string;
  }
}
