import type { IPhysicsService } from '../shared/services';
import type { Quat, Vec3 } from '../shared/types';
import { normalize3 } from '../shared/math';
import { addVec3, rotateVecByQuat } from './helpers';
import type { WheelInfo } from './types';

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
}
