import type { PlayerConfig } from './types';

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  walkSpeed: 2.8,
  runSpeed: 5.8,
  sprintSpeed: 7.8,
  acceleration: 28,
  deceleration: 36,
  jumpForce: 5.5,
  rotationSpeed: 0.002,
  cameraDistance: 5,
  cameraHeight: 2,
  cameraMinDist: 2,
  cameraMaxDist: 10,
  capsuleRadius: 0.4,
  capsuleHeight: 1.8,
  maxHealth: 100,
  maxArmor: 100,
};
