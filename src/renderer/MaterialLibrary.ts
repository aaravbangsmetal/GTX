import * as THREE from 'three';
import type { EventBus } from '../shared/events';

export class MaterialLibrary {
  private materials = new Map<string, THREE.Material>();
  private buildingWindow: THREE.MeshStandardMaterial | null = null;

  init(events: EventBus): void {
    this.createBuildingMaterials();
    this.createRoadMaterials();
    this.createNeonMaterials();
    this.createVegetationMaterials();

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

  private createRoadMaterials(): void {
    this.add(
      'road-asphalt',
      new THREE.MeshStandardMaterial({
        color: 0x2a2a2e,
        roughness: 0.9,
        metalness: 0.0,
      }),
    );

    this.add(
      'road-marking',
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );

    this.add(
      'sidewalk-concrete',
      new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.85,
        metalness: 0.0,
      }),
    );
  }

  private createNeonMaterials(): void {
    this.add(
      'neon-pink',
      new THREE.MeshStandardMaterial({
        color: 0xff1493,
        emissive: 0xff1493,
        emissiveIntensity: 2.0,
        roughness: 0.3,
        metalness: 0.1,
        toneMapped: false,
      }),
    );

    this.add(
      'neon-blue',
      new THREE.MeshStandardMaterial({
        color: 0x00bfff,
        emissive: 0x00bfff,
        emissiveIntensity: 2.0,
        roughness: 0.3,
        metalness: 0.1,
        toneMapped: false,
      }),
    );
  }

  private createVegetationMaterials(): void {
    this.add(
      'palm-trunk',
      new THREE.MeshStandardMaterial({
        color: 0x8b6914,
        roughness: 0.9,
        metalness: 0.0,
      }),
    );

    this.add(
      'palm-leaves',
      new THREE.MeshStandardMaterial({
        color: 0x228b22,
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    );
  }

  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}
