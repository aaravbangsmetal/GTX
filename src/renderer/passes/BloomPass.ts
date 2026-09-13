import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function createBloomPass(
  width: number,
  height: number,
  strength = 0.3,
): UnrealBloomPass {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    strength,
    0.4,
    0.8,
  );
  return bloomPass;
}
