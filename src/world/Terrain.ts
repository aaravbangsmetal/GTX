import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
} from 'three';
import type { WorldMaterials } from './WorldMaterials';

const TERRAIN_SIZE = 2048;
const TERRAIN_SEGMENTS = 128;

export class Terrain {
  private heightCache = new Map<string, number>();

  generateGroundMesh(materials: WorldMaterials): Mesh {
    const geometry = this.buildHeightmapGeometry();
    const mesh = new Mesh(geometry, materials.get('terrain_grass', '#3A5F3A'));
    mesh.name = 'terrain_ground';
    mesh.receiveShadow = true;
    return mesh;
  }

  generateBridges(materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'bridges';

    const northBridge = this.createBridge(8, 120, 'arch', materials);
    northBridge.position.set(50, 0, 400);
    northBridge.rotation.y = Math.PI / 2;
    group.add(northBridge);

    const southBridge = this.createBridge(10, 100, 'flat', materials);
    southBridge.position.set(-50, 0, 380);
    southBridge.rotation.y = Math.PI / 2;
    group.add(southBridge);

    return group;
  }

  generateHarborDocks(materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'harbor_docks';

    for (let i = 0; i < 4; i++) {
      const dockGeo = new Mesh(new BoxGeometry(40, 0.5, 15), materials.asphalt());
      dockGeo.position.set(-600 + i * 50, 2, -500);
      group.add(dockGeo);
    }

    return group;
  }

  getHeightAt(x: number, z: number): number {
    const key = `${Math.round(x)}_${Math.round(z)}`;
    const cached = this.heightCache.get(key);
    if (cached !== undefined) return cached;

    let height = 0;

    if (x > 800) {
      const t = Math.min(1, (x - 800) / 30);
      height = -t * 0.5;
    }

    if (z > 400 && x > -400 && x < 1000) {
      height = Math.max(height, 1);
    }

    if (x < -400 && x > -800 && z < -400 && z > -700) {
      if (Math.abs((x + 600) % 50) < 20) {
        height = 2;
      }
    }

    this.heightCache.set(key, height);
    return height;
  }

  private buildHeightmapGeometry(): BufferGeometry {
    const half = TERRAIN_SIZE / 2;
    const vertsPerSide = TERRAIN_SEGMENTS + 1;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz < vertsPerSide; iz++) {
      for (let ix = 0; ix < vertsPerSide; ix++) {
        const x = -half + (ix / TERRAIN_SEGMENTS) * TERRAIN_SIZE;
        const z = -half + (iz / TERRAIN_SEGMENTS) * TERRAIN_SIZE;
        const y = this.getHeightAt(x, z);
        positions.push(x, y, z);
      }
    }

    for (let iz = 0; iz < TERRAIN_SEGMENTS; iz++) {
      for (let ix = 0; ix < TERRAIN_SEGMENTS; ix++) {
        const a = iz * vertsPerSide + ix;
        const b = a + 1;
        const c = a + vertsPerSide;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private createBridge(
    width: number,
    length: number,
    type: 'arch' | 'flat',
    materials: WorldMaterials,
  ): Group {
    const group = new Group();
    const deckY = type === 'arch' ? 3 : 1.5;

    const deck = new Mesh(new BoxGeometry(length, 0.4, width), materials.asphalt());
    deck.position.y = deckY;
    group.add(deck);

    if (type === 'arch') {
      for (const side of [-1, 1]) {
        const pillar = new Mesh(new BoxGeometry(2, 6, 2), materials.sidewalk());
        pillar.position.set(side * length * 0.35, 3, 0);
        group.add(pillar);
      }
    }

    for (const side of [-1, 1]) {
      const rail = new Mesh(new BoxGeometry(length, 0.8, 0.2), materials.sidewalk());
      rail.position.set(0, deckY + 0.5, side * width / 2);
      group.add(rail);
    }

    return group;
  }
}
