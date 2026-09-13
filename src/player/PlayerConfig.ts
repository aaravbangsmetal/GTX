import type { PlayerConfig } from './types';

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  walkSpeed: 4,
  runSpeed: 8,
  sprintSpeed: 12,
  jumpForce: 6,
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
