import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
} from 'three';
import { DistrictId } from '../shared/types';
import { vec3 } from '../shared/math';
import { getDistrictConfig } from './District';
import type { DistrictBounds, PropPlacement, PropType } from './types';
import type { WorldMaterials } from './WorldMaterials';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DISTRICT_PROP_RULES: Record<DistrictId, PropType[]> = {
  [DistrictId.OCEAN_BEACH]: ['palm', 'palm', 'bench', 'umbrella', 'bench'],
  [DistrictId.DOWNTOWN]: ['lamp', 'neon', 'bench', 'trash', 'busstop'],
  [DistrictId.LITTLE_HAVANA]: ['bench', 'trash', 'lamp', 'bench'],
  [DistrictId.VICE_PORT]: ['container', 'container', 'trash', 'lamp'],
  [DistrictId.STARFISH_ISLAND]: ['palm', 'bench', 'lamp'],
};

export class PropPlacer {
  private allProps: PropPlacement[] = [];

  constructor() {
    this.allProps = this.generateAllProps();
  }

  getAllProps(): PropPlacement[] {
    return this.allProps;
  }

  getPropsInChunk(cx: number, cz: number, chunkSize = 128): PropPlacement[] {
    const minX = cx * chunkSize;
    const maxX = minX + chunkSize;
    const minZ = cz * chunkSize;
    const maxZ = minZ + chunkSize;

    return this.allProps.filter(
      (p) => p.position.x >= minX && p.position.x < maxX && p.position.z >= minZ && p.position.z < maxZ,
    );
  }

  placeProps(
    district: DistrictId,
    bounds: DistrictBounds,
    density: number,
  ): PropPlacement[] {
    const props: PropPlacement[] = [];
    const rules = DISTRICT_PROP_RULES[district];
    const rand = seededRandom(district * 313 + 7);
    const count = Math.floor(
      ((bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ)) / 8000 * density,
    );

    for (let i = 0; i < count; i++) {
      const type = rules[Math.floor(rand() * rules.length)];
      props.push({
        type,
        position: vec3(
          bounds.minX + rand() * (bounds.maxX - bounds.minX),
          0,
          bounds.minZ + rand() * (bounds.maxZ - bounds.minZ),
        ),
        rotation: rand() * Math.PI * 2,
        scale: 0.8 + rand() * 0.4,
        district,
      });
    }

    return props;
  }

  generatePropMesh(prop: PropPlacement, materials: WorldMaterials): Object3D {
    const group = new Group();
    group.position.set(prop.position.x, prop.position.y, prop.position.z);
    group.rotation.y = prop.rotation;
    group.scale.setScalar(prop.scale);

    switch (prop.type) {
      case 'palm':
        group.add(this.createPalmMesh(materials));
        break;
      case 'lamp':
        group.add(this.createLampMesh(materials));
        break;
      case 'neon':
        group.add(this.createNeonMesh(materials));
        break;
      case 'bench':
        group.add(this.createBenchMesh(materials));
        break;
      case 'trash':
        group.add(this.createTrashMesh(materials));
        break;
      case 'busstop':
        group.add(this.createBusStopMesh(materials));
        break;
      case 'umbrella':
        group.add(this.createUmbrellaMesh(materials));
        break;
      case 'container':
        group.add(this.createContainerMesh(materials));
        break;
    }

    return group;
  }

  generateInstancedProps(props: PropPlacement[], type: PropType, materials: WorldMaterials): InstancedMesh | null {
    const filtered = props.filter((p) => p.type === type);
    if (filtered.length === 0) return null;

    const prototype = this.generatePropMesh(
      { type, position: vec3(0, 0, 0), rotation: 0, scale: 1, district: DistrictId.DOWNTOWN },
      materials,
    );
    const geo = this.extractGeometry(prototype);
    if (!geo) return null;

    const mesh = new InstancedMesh(geo.geometry, geo.material, filtered.length);
    mesh.name = `instanced_${type}`;
    const dummy = new Object3D();

    filtered.forEach((prop, i) => {
      dummy.position.set(prop.position.x, prop.position.y, prop.position.z);
      dummy.rotation.y = prop.rotation;
      dummy.scale.setScalar(prop.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  generateChunkProps(props: PropPlacement[], materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'chunk_props';

    const types: PropType[] = ['palm', 'lamp', 'neon', 'bench', 'trash', 'busstop', 'umbrella', 'container'];
    for (const type of types) {
      const instanced = this.generateInstancedProps(props, type, materials);
      if (instanced) group.add(instanced);
    }

    return group;
  }

  getPropCount(): number {
    return this.allProps.length;
  }

  private generateAllProps(): PropPlacement[] {
    const all: PropPlacement[] = [];
    const districts = [
      DistrictId.OCEAN_BEACH,
      DistrictId.DOWNTOWN,
      DistrictId.LITTLE_HAVANA,
      DistrictId.VICE_PORT,
      DistrictId.STARFISH_ISLAND,
    ];

    for (const id of districts) {
      const config = getDistrictConfig(id);
      all.push(...this.placeProps(id, config.bounds, config.propDensity));
    }

    return all;
  }

  private createPalmMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const trunk = new Mesh(new CylinderGeometry(0.2, 0.3, 6, 6), materials.get('palm_trunk', '#8B6914'));
    trunk.position.y = 3;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new Mesh(new BoxGeometry(0.15, 3, 0.5), materials.get('palm_leaf', '#2D8B2D'));
      leaf.position.set(Math.cos(i * 1.2) * 0.5, 6, Math.sin(i * 1.2) * 0.5);
      leaf.rotation.z = 0.6;
      leaf.rotation.y = i * 1.2;
      g.add(leaf);
    }
    return g;
  }

  private createLampMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const pole = new Mesh(new CylinderGeometry(0.08, 0.1, 5, 6), materials.sidewalk());
    pole.position.y = 2.5;
    g.add(pole);
    const head = new Mesh(new BoxGeometry(0.4, 0.2, 0.3), materials.neon('#FFFFAA'));
    head.position.y = 5;
    g.add(head);
    return g;
  }

  private createNeonMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const sign = new Mesh(new BoxGeometry(2, 1, 0.2), materials.neon('#FF1493'));
    sign.position.y = 4;
    g.add(sign);
    const bracket = new Mesh(new BoxGeometry(0.1, 4, 0.1), materials.sidewalk());
    bracket.position.y = 2;
    g.add(bracket);
    return g;
  }

  private createBenchMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const seat = new Mesh(new BoxGeometry(1.5, 0.1, 0.5), materials.get('bench_wood', '#8B4513'));
    seat.position.y = 0.5;
    g.add(seat);
    return g;
  }

  private createTrashMesh(materials: WorldMaterials): Mesh {
    return new Mesh(new CylinderGeometry(0.3, 0.25, 0.8, 8), materials.get('trash_can', '#444444'));
  }

  private createBusStopMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const shelter = new Mesh(new BoxGeometry(3, 2.5, 1.5), materials.get('bus_shelter', '#666666'));
    shelter.position.y = 1.25;
    g.add(shelter);
    return g;
  }

  private createUmbrellaMesh(materials: WorldMaterials): Group {
    const g = new Group();
    const pole = new Mesh(new CylinderGeometry(0.05, 0.05, 2, 4), materials.sidewalk());
    pole.position.y = 1;
    g.add(pole);
    const canopy = new Mesh(new CylinderGeometry(1.5, 1.5, 0.1, 8), materials.neon('#FF6B9D'));
    canopy.position.y = 2;
    g.add(canopy);
    return g;
  }

  private createContainerMesh(materials: WorldMaterials): Mesh {
    const colors = ['#CC3333', '#3366CC', '#33CC66', '#CCCC33'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const box = new Mesh(new BoxGeometry(6, 2.5, 2.5), materials.get(`container_${color}`, color));
    box.position.y = 1.25;
    return box;
  }

  private extractGeometry(obj: Object3D): { geometry: import('three').BufferGeometry; material: import('three').Material } | null {
    let result: { geometry: import('three').BufferGeometry; material: import('three').Material } | null = null;
    obj.traverse((child) => {
      if (child instanceof Mesh && !result) {
        result = { geometry: child.geometry, material: child.material as import('three').Material };
      }
    });
    return result;
  }
}
