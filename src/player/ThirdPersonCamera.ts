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

    const finalPos = this.resolveCollision(playerPos, desiredPos);

    if (!this.initialized) {
      this.currentPosition.copy(finalPos);
      this.initialized = true;
    } else {
      const t = clamp(dt / 0.1, 0, 1);
      this.currentPosition.lerp(finalPos, t);
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(playerPos.x, playerPos.y + 1.5, playerPos.z);
  }

  private resolveCollision(playerPos: Vec3, desiredPos: THREE.Vector3): THREE.Vector3 {
    const origin = vec3(playerPos.x, playerPos.y + 1.0, playerPos.z);
    const dir = vec3(
      desiredPos.x - origin.x,
      desiredPos.y - origin.y,
      desiredPos.z - origin.z,
    );
    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (length < 0.001) return desiredPos;

    const normalized = vec3(dir.x / length, dir.y / length, dir.z / length);
    const hit = this.physics.raycast(origin, normalized, length, CollisionGroup.STATIC);

    if (!hit) return desiredPos;

    return new THREE.Vector3(
      hit.point.x - hit.normal.x * 0.3,
      hit.point.y - hit.normal.y * 0.3,
      hit.point.z - hit.normal.z * 0.3,
    );
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

  snapTo(_playerPos: Vec3): void {
    this.initialized = false;
  }
}
