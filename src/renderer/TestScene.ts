import * as THREE from 'three';
import type { MaterialLibrary } from './MaterialLibrary';
import type { SceneManager } from './SceneManager';
import { RenderLayer } from './types';

export function buildTestScene(
  sceneManager: SceneManager,
  materials: MaterialLibrary,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'test-scene';

  const facadeMat = materials.get('building-facade') as THREE.MeshStandardMaterial;
  const windowMat = materials.get('building-window') as THREE.MeshStandardMaterial;
  const neonMat = materials.get('neon-pink') as THREE.MeshStandardMaterial;

  const building = new THREE.Group();

  const baseGeo = new THREE.BoxGeometry(20, 40, 16);
  const baseColors = new Float32Array(baseGeo.attributes.position.count * 3);
  const color = new THREE.Color(0xfff5e6);
  for (let i = 0; i < baseColors.length; i += 3) {
    baseColors[i] = color.r;
    baseColors[i + 1] = color.g;
    baseColors[i + 2] = color.b;
  }
  baseGeo.setAttribute('color', new THREE.BufferAttribute(baseColors, 3));

  const base = new THREE.Mesh(baseGeo, facadeMat);
  base.position.y = 20;
  base.castShadow = true;
  base.receiveShadow = true;
  building.add(base);

  const crownGeo = new THREE.BoxGeometry(14, 8, 12);
  const crown = new THREE.Mesh(crownGeo, facadeMat.clone());
  crown.position.y = 44;
  crown.castShadow = true;
  building.add(crown);

  const windowGeo = new THREE.PlaneGeometry(2, 3);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.set(-6 + col * 4, 8 + row * 4, 8.1);
      building.add(win);
    }
  }

  const neonGeo = new THREE.BoxGeometry(12, 2, 0.5);
  const neonSign = new THREE.Mesh(neonGeo, neonMat);
  neonSign.position.set(0, 38, 8.3);
  building.add(neonSign);

  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = materials.get('sidewalk-concrete') as THREE.MeshStandardMaterial;
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);

  building.position.set(0, 0, -30);
  group.add(building);

  sceneManager.addToLayer(group, RenderLayer.WORLD);
  return group;
}
