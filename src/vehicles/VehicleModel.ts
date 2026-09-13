import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { IAssetLoader } from '../shared/types';
import type { VehicleTypeConfig, WheelInfo } from './types';

const VICE_COLORS = ['#FF6B9D', '#98D8C8', '#FF8C42', '#7B4FBF', '#FA8072', '#FFF5E6'];

export class VehicleModel {
  private group = new Group();
  private wheelMeshes: Mesh[] = [];
  private bodyMesh: Mesh | null = null;
  private damageLevel: 0 | 1 | 2 | 3 = 0;

  async load(config: VehicleTypeConfig, _assets: IAssetLoader): Promise<void> {
    this.group.clear();
    this.wheelMeshes = [];

    const color = this.pickColor(config.id);
    const bodyMat = new MeshStandardMaterial({
      color: new Color(color),
      roughness: 0.6,
      metalness: 0.2,
    });

    const bodyGeo = new BoxGeometry(config.dimensions.x, config.dimensions.y, config.dimensions.z);
    this.bodyMesh = new Mesh(bodyGeo, bodyMat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    if (config.id === 'police') {
      const stripe = new Mesh(
        new BoxGeometry(config.dimensions.x * 0.95, config.dimensions.y * 0.15, config.dimensions.z * 1.02),
        new MeshStandardMaterial({ color: 0xffffff }),
      );
      stripe.position.y = config.dimensions.y * 0.1;
      this.group.add(stripe);
    }

    if (config.id !== 'motorcycle') {
      const glass = new Mesh(
        new BoxGeometry(config.dimensions.x * 0.5, config.dimensions.y * 0.35, config.dimensions.z * 0.9),
        new MeshStandardMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.5,
          roughness: 0.1,
        }),
      );
      glass.position.set(0, config.dimensions.y * 0.25, -config.dimensions.x * 0.1);
      this.group.add(glass);
    }

    const wheelGeo = new CylinderGeometry(config.wheelRadius, config.wheelRadius, config.wheelRadius * 0.5, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const halfW = config.dimensions.z / 2;
    const halfL = config.dimensions.x / 2;
    const wheelY = -config.dimensions.y / 2 + config.wheelRadius * 0.5;

    const wheelPositions =
      config.wheelCount === 2
        ? [
            { x: 0, y: wheelY, z: -halfL * 0.7, front: true },
            { x: 0, y: wheelY, z: halfL * 0.7, front: false },
          ]
        : [
            { x: -halfW, y: wheelY, z: -halfL * 0.75, front: true },
            { x: halfW, y: wheelY, z: -halfL * 0.75, front: true },
            { x: -halfW, y: wheelY, z: halfL * 0.75, front: false },
            { x: halfW, y: wheelY, z: halfL * 0.75, front: false },
          ];

    for (const wp of wheelPositions) {
      const wheel = new Mesh(wheelGeo, wheelMat);
      wheel.position.set(wp.x, wp.y, wp.z);
      wheel.castShadow = true;
      this.group.add(wheel);
      this.wheelMeshes.push(wheel);
    }

    this.group.name = `vehicle_${config.id}`;
  }

  private pickColor(id: VehicleTypeConfig['id']): string {
    if (id === 'sportscar') return '#CC2222';
    if (id === 'motorcycle') return '#111111';
    if (id === 'truck') return '#EEEEEE';
    if (id === 'police') return '#111111';
    return VICE_COLORS[Math.floor(Math.random() * VICE_COLORS.length)];
  }

  getMesh(): Group {
    return this.group;
  }

  updateWheels(wheels: WheelInfo[]): void {
    for (let i = 0; i < this.wheelMeshes.length && i < wheels.length; i++) {
      const mesh = this.wheelMeshes[i];
      const wheel = wheels[i];
      mesh.rotation.x = wheel.spinAngle;
      if (wheel.isFront) {
        mesh.rotation.y = wheel.steerAngle;
      }
    }
  }

  setDamageLevel(level: 0 | 1 | 2 | 3): void {
    if (this.damageLevel === level || !this.bodyMesh) return;
    this.damageLevel = level;
    const mat = this.bodyMesh.material as MeshStandardMaterial;

    switch (level) {
      case 0:
        mat.color.offsetHSL(0, 0, 0);
        break;
      case 1:
        mat.roughness = 0.85;
        break;
      case 2:
        mat.color.offsetHSL(0, 0, -0.15);
        mat.roughness = 0.95;
        break;
      case 3:
        mat.color.setHex(0x333333);
        mat.emissive.setHex(0xff4400);
        mat.emissiveIntensity = 0.5;
        break;
    }
  }

  syncTransform(position: { x: number; y: number; z: number }, rotationY: number): void {
    this.group.position.set(position.x, position.y, position.z);
    this.group.rotation.y = rotationY;
  }

  dispose(): void {
    this.group.traverse((obj: Object3D) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.group.clear();
  }
}
