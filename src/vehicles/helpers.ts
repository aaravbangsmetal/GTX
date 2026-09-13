import type { Quat, Vec3 } from '../shared/types';

export function rotateVecByQuat(v: Vec3, q: Quat): Vec3 {
  const qx = q.x;
  const qy = q.y;
  const qz = q.z;
  const qw = q.w;

  const ix = qw * v.x + qy * v.z - qz * v.y;
  const iy = qw * v.y + qz * v.x - qx * v.z;
  const iz = qw * v.z + qx * v.y - qy * v.x;
  const iw = -qx * v.x - qy * v.y - qz * v.z;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
  };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function headingFromQuat(q: Quat): number {
  const forward = rotateVecByQuat({ x: 0, y: 0, z: -1 }, q);
  return Math.atan2(forward.x, -forward.z);
}

export function quatFromHeading(yaw: number): Quat {
  const half = yaw / 2;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

export function speedFromVelocity(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}
