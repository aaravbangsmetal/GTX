import type { EntityId } from '../shared/types';

export enum PlayerAnimState {
  IDLE,
  WALK,
  RUN,
  JUMP,
  FALL,
  LAND,
  ENTER_VEHICLE,
  EXIT_VEHICLE,
  DRIVE,
  AIM,
  SHOOT,
  MELEE,
  DEATH,
}

export enum PlayerMode {
  ON_FOOT,
  IN_VEHICLE_DRIVER,
  IN_VEHICLE_PASSENGER,
  CUTSCENE,
  DEAD,
}

export interface PlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  sprintSpeed: number;
  acceleration: number;
  deceleration: number;
  jumpForce: number;
  rotationSpeed: number;
  cameraDistance: number;
  cameraHeight: number;
  cameraMinDist: number;
  cameraMaxDist: number;
  capsuleRadius: number;
  capsuleHeight: number;
  maxHealth: number;
  maxArmor: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  enterPassenger: boolean;
  attack: boolean;
  aim: boolean;
  mouseX: number;
  mouseY: number;
  scrollDelta: number;
}

export interface PlayerInternalState {
  health: number;
  armor: number;
  money: number;
  wantedLevel: number;
  weaponId: string | null;
  mode: PlayerMode;
  vehicleId: EntityId | null;
}
