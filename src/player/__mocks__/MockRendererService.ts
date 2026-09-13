import * as THREE from 'three';
import type { DayNightState, IRendererService } from '../../shared/services';
import type { Vec3 } from '../../shared/types';

export function createMockRendererService(): IRendererService {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer();

  const materials = new Map<string, THREE.Material>([
    ['character-skin', new THREE.MeshStandardMaterial({ color: 0xd4a574 })],
    ['character-clothes', new THREE.MeshStandardMaterial({ color: 0x3366cc })],
  ]);

  return {
    getScene: () => scene,
    getActiveCamera: () => camera,
    getRenderer: () => renderer,
    addToScene: (object) => scene.add(object),
    removeFromScene: (object) => scene.remove(object),
    getMaterial: (id: string) => {
      const mat = materials.get(id);
      if (!mat) throw new Error(`Unknown material: ${id}`);
      return mat;
    },
    getDayNightState: (): DayNightState => ({
      hour: 18,
      sunAngle: 0.5,
      isNight: false,
      bloomStrength: 0.3,
    }),
    setCameraPosition: (pos: Vec3) => {
      camera.position.set(pos.x, pos.y, pos.z);
    },
    lookAt: (target: Vec3) => {
      camera.lookAt(target.x, target.y, target.z);
    },
  };
}
