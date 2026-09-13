import * as THREE from 'three';
import type { EventBus } from '../shared/events';

export class MaterialLibrary {
  private materials = new Map<string, THREE.Material>();
  private buildingWindow: THREE.MeshStandardMaterial | null = null;

  init(events: EventBus): void {
    this.createBuildingMaterials();

    events.on('world:timeChange', ({ isNight }) => {
      if (this.buildingWindow) {
        this.buildingWindow.emissiveIntensity = isNight ? 0.8 : 0.0;
      }
    });
  }

  get(id: string): THREE.Material {
    const mat = this.materials.get(id);
    if (!mat) {
      throw new Error(`Unknown material: ${id}`);
    }
    return mat;
  }

  private add(id: string, material: THREE.Material): void {
    this.materials.set(id, material);
  }

  private createBuildingMaterials(): void {
    this.add(
      'building-facade',
      new THREE.MeshStandardMaterial({
        color: 0xfff5e6,
        roughness: 0.8,
        metalness: 0.0,
        vertexColors: true,
      }),
    );

    this.buildingWindow = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      emissive: 0xffffff,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.1,
    });
    this.add('building-window', this.buildingWindow);
  }

  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}
