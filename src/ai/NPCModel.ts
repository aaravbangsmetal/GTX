import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { IAssetLoader } from '../shared/types';
import { NPCType } from './types';

const SHIRT_COLORS = ['#FF6B9D', '#2DD4BF', '#FF8C42', '#7B4FBF', '#98D8C8', '#FA8072'];

export class NPCModel {
  private group = new Group();
  private bobPhase = 0;
  private animState: 'idle' | 'walk' | 'run' = 'idle';
  private baseY = 0;

  async load(type: NPCType, _assets: IAssetLoader): Promise<void> {
    this.group.clear();

    const isPolice = type === NPCType.POLICE_OFFICER || type === NPCType.POLICE_DRIVER;
    const shirtColor = isPolice ? '#1A3A6B' : SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    const pantsColor = isPolice ? '#1A1A2E' : '#2A2A2E';
    const skinColor = '#E8B88A';

    const bodyMat = new MeshStandardMaterial({ color: new Color(shirtColor) });
    const pantsMat = new MeshStandardMaterial({ color: new Color(pantsColor) });
    const skinMat = new MeshStandardMaterial({ color: new Color(skinColor) });

    const torso = new Mesh(new BoxGeometry(0.4, 0.5, 0.25), bodyMat);
    torso.position.y = 1.0;
    this.group.add(torso);

    const head = new Mesh(new CapsuleGeometry(0.12, 0.1, 4, 8), skinMat);
    head.position.y = 1.45;
    this.group.add(head);

    const legGeo = new BoxGeometry(0.15, 0.45, 0.15);
    const leftLeg = new Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.1, 0.55, 0);
    this.group.add(leftLeg);

    const rightLeg = new Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.1, 0.55, 0);
    this.group.add(rightLeg);

    const armGeo = new BoxGeometry(0.12, 0.4, 0.12);
    const leftArm = new Mesh(armGeo, skinMat);
    leftArm.position.set(-0.28, 1.0, 0);
    this.group.add(leftArm);

    const rightArm = new Mesh(armGeo, skinMat);
    rightArm.position.set(0.28, 1.0, 0);
    this.group.add(rightArm);

    if (isPolice) {
      const hat = new Mesh(new BoxGeometry(0.28, 0.06, 0.28), bodyMat);
      hat.position.y = 1.58;
      this.group.add(hat);
    }

    this.baseY = 0;
    this.group.name = `npc_${type}`;
  }

  getMesh(): Group {
    return this.group;
  }

  setAnimation(state: 'idle' | 'walk' | 'run'): void {
    this.animState = state;
  }

  updateAnimation(dt: number): void {
    if (this.animState === 'idle') {
      this.group.position.y = this.baseY;
      return;
    }

    const speed = this.animState === 'run' ? 12 : 6;
    this.bobPhase += dt * speed;
    this.group.position.y = this.baseY + Math.sin(this.bobPhase) * 0.03;
  }

  setRotation(yaw: number): void {
    this.group.rotation.y = yaw;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.group.clear();
  }
}
