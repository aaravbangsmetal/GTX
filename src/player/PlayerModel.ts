import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { IAssetLoader } from '../shared/types';
import type { IRendererService } from '../shared/services';

const PLAYER_MODEL_URL = '/assets/player/models/player.glb';

export class PlayerModel {
  private group = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];

  async load(assets: IAssetLoader, renderer: IRendererService): Promise<void> {
    if (assets.has(PLAYER_MODEL_URL)) {
      const gltf = assets.get<GLTF>(PLAYER_MODEL_URL);
      this.group.add(gltf.scene);
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.clips = gltf.animations;
      this.group.scale.setScalar(1);
      return;
    }

    this.buildPlaceholder(renderer);
    renderer.addToScene(this.group);
  }

  private buildPlaceholder(renderer: IRendererService): void {
    const skin = renderer.getMaterial('character-skin');
    const clothes = renderer.getMaterial('character-clothes');
    const pants = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skin);
    head.position.y = 1.65;
    this.group.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.25), clothes);
    torso.position.y = 1.2;
    this.group.add(torso);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), clothes);
    leftArm.position.set(-0.32, 1.15, 0);
    this.group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), clothes);
    rightArm.position.set(0.32, 1.15, 0);
    this.group.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), pants);
    leftLeg.position.set(-0.12, 0.4, 0);
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), pants);
    rightLeg.position.set(0.12, 0.4, 0);
    this.group.add(rightLeg);

    this.group.name = 'player_model';
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  getMixer(): THREE.AnimationMixer | null {
    return this.mixer;
  }

  getClips(): THREE.AnimationClip[] {
    return this.clips;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
    this.mixer = null;
    this.clips = [];
  }
}
