import * as THREE from 'three';
import { distance3 } from '../shared/math';
import type { Vec3 } from '../shared/types';

export interface LODEntry {
  object: THREE.Object3D;
  lod0: THREE.Object3D;
  lod1: THREE.Object3D;
  lod2: THREE.Object3D;
}

const LOD_DISTANCES = {
  lod1: 100,
  lod2: 300,
  hide: 600,
};

export class LODManager {
  private entries: LODEntry[] = [];

  register(entry: LODEntry): void {
    this.entries.push(entry);
    this.setActiveLod(entry, entry.lod0);
  }

  unregister(object: THREE.Object3D): void {
    this.entries = this.entries.filter((e) => e.object !== object);
  }

  update(cameraPos: Vec3): void {
    for (const entry of this.entries) {
      const dist = distance3(cameraPos, {
        x: entry.object.position.x,
        y: entry.object.position.y,
        z: entry.object.position.z,
      });

      if (dist > LOD_DISTANCES.hide) {
        entry.object.visible = false;
        continue;
      }

      entry.object.visible = true;

      if (dist < LOD_DISTANCES.lod1) {
        this.setActiveLod(entry, entry.lod0);
      } else if (dist < LOD_DISTANCES.lod2) {
        this.setActiveLod(entry, entry.lod1);
      } else {
        this.setActiveLod(entry, entry.lod2);
      }
    }
  }

  private setActiveLod(entry: LODEntry, active: THREE.Object3D): void {
    entry.lod0.visible = active === entry.lod0;
    entry.lod1.visible = active === entry.lod1;
    entry.lod2.visible = active === entry.lod2;
  }
}
