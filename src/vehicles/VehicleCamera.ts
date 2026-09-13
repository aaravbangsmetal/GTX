import { clamp, lerp } from '../shared/math';
import type { Vec3 } from '../shared/types';
import { PerspectiveCamera } from 'three';

export class VehicleCamera {
  private active = false;
  private camera: PerspectiveCamera | null = null;
  private baseFov = 65;
  private shakeTime = 0;

  activate(camera: PerspectiveCamera): void {
    this.active = true;
    this.camera = camera;
    this.baseFov = camera.fov;
  }

  deactivate(): void {
    this.active = false;
    if (this.camera) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera = null;
  }

  update(vehiclePos: Vec3, heading: number, speed: number, dt: number): void {
    if (!this.active || !this.camera) return;

    const speedKmh = speed * 3.6;
    const behindDist = 3;
    const height = 1.5;

    const forwardX = Math.sin(heading);
    const forwardZ = -Math.cos(heading);

    const targetX = vehiclePos.x - forwardX * behindDist;
    const targetZ = vehiclePos.z - forwardZ * behindDist;
    const targetY = vehiclePos.y + height;

    this.shakeTime += dt * 10;
    const shakeAmp = clamp(speedKmh * 0.0005, 0, 0.08);
    const shakeX = Math.sin(this.shakeTime * 3.7) * shakeAmp;
    const shakeY = Math.sin(this.shakeTime * 5.1) * shakeAmp;

    this.camera.position.x = lerp(this.camera.position.x, targetX + shakeX, clamp(dt * 6, 0, 1));
    this.camera.position.y = lerp(this.camera.position.y, targetY + shakeY, clamp(dt * 6, 0, 1));
    this.camera.position.z = lerp(this.camera.position.z, targetZ, clamp(dt * 6, 0, 1));

    const lookX = vehiclePos.x + forwardX * 10;
    const lookZ = vehiclePos.z + forwardZ * 10;
    this.camera.lookAt(lookX, vehiclePos.y + 0.5, lookZ);

    const targetFov = clamp(this.baseFov + speedKmh * 0.1, this.baseFov, 80);
    this.camera.fov = lerp(this.camera.fov, targetFov, clamp(dt * 4, 0, 1));
    this.camera.updateProjectionMatrix();
  }
}
