import type { IPhysicsService } from '../shared/services';
import type { Quat, Vec3 } from '../shared/types';
import { normalize3 } from '../shared/math';
import { addVec3, rotateVecByQuat } from './helpers';
import * as CANNON from 'cannon-es';
import type { VehicleTypeConfig, WheelInfo } from './types';

export class WheelRaycaster {
  constructor(private physics: IPhysicsService) {}

  raycastWheels(chassisPos: Vec3, chassisQuat: Quat, wheels: WheelInfo[], restLength: number): void {
    const up = rotateVecByQuat({ x: 0, y: 1, z: 0 }, chassisQuat);
    const down = { x: -up.x, y: -up.y, z: -up.z };

    for (const wheel of wheels) {
      const worldPos = addVec3(chassisPos, rotateVecByQuat(wheel.position, chassisQuat));
      const maxDist = restLength + wheel.radius;
      const hit = this.physics.raycast(worldPos, down, maxDist);

      if (hit) {
        wheel.isGrounded = true;
        wheel.groundNormal = normalize3(hit.normal);
        wheel.suspensionLength = hit.distance - wheel.radius;
      } else {
        wheel.isGrounded = false;
        wheel.groundNormal = { x: 0, y: 1, z: 0 };
        wheel.suspensionLength = restLength;
      }
    }
  }

  applySuspensionForce(
    wheel: WheelInfo,
    chassisBody: CANNON.Body,
    config: VehicleTypeConfig,
    chassisQuat: Quat,
  ): void {
    if (!wheel.isGrounded) return;

    const restLength = config.suspensionRestLength;
    const compression = restLength - wheel.suspensionLength;
    const springForce = config.suspensionStiffness * compression;

    const up = rotateVecByQuat({ x: 0, y: 1, z: 0 }, chassisQuat);
    const worldPos = addVec3(
      { x: chassisBody.position.x, y: chassisBody.position.y, z: chassisBody.position.z },
      rotateVecByQuat(wheel.position, chassisQuat),
    );

    const verticalVel =
      chassisBody.velocity.x * up.x + chassisBody.velocity.y * up.y + chassisBody.velocity.z * up.z;
    const damperForce = config.suspensionDamping * verticalVel;
    const totalForce = Math.max(0, springForce - damperForce);

    const force = new CANNON.Vec3(up.x * totalForce, up.y * totalForce, up.z * totalForce);
    const point = new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z);
    chassisBody.applyForce(force, point);
  }
}
