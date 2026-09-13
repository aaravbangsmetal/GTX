import * as THREE from 'three';
import { clamp } from '../shared/math';
import { vec3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import type { IPhysicsService } from '../shared/services';
import { CollisionGroup } from './collision';
import type { InputState, PlayerConfig } from './types';

export class ThirdPersonCamera {
  private yaw = 0;
  private pitch = 0.3;
  private distance: number;
  private currentPosition = new THREE.Vector3();
  private initialized = false;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private config: PlayerConfig,
    private physics: IPhysicsService,
  ) {
    this.distance = config.cameraDistance;
  }

  update(playerPos: Vec3, input: InputState, dt: number): void {
    this.yaw -= input.mouseX * this.config.rotationSpeed;
    this.pitch -= input.mouseY * this.config.rotationSpeed;
    this.pitch = clamp(this.pitch, -0.5, 1.2);

    this.distance += input.scrollDelta * 0.5;
    this.distance = clamp(this.distance, this.config.cameraMinDist, this.config.cameraMaxDist);

    const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const offsetY = Math.sin(this.pitch) * this.distance + this.config.cameraHeight;
    const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;

    const desiredPos = new THREE.Vector3(
      playerPos.x + offsetX,
      playerPos.y + offsetY,
      playerPos.z + offsetZ,
    );

    if (!this.initialized) {
      this.currentPosition.copy(desiredPos);
      this.initialized = true;
    } else {
      const t = clamp(dt / 0.1, 0, 1);
      this.currentPosition.lerp(desiredPos, t);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(playerPos.x, playerPos.y + 1.5, playerPos.z);
  }

  setDistance(d: number): void {
    this.distance = clamp(d, this.config.cameraMinDist, this.config.cameraMaxDist);
  }

  getYaw(): number {
    return this.yaw;
  }

  getDistance(): number {
    return this.distance;
  }
}
