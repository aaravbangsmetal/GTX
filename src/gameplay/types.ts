import type { EntityId, GameContext, Vec3 } from '../shared/types';

export interface WeaponConfig {
  id: string;
  name: string;
  type: 'melee' | 'pistol' | 'smg' | 'shotgun';
  damage: number;
  range: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  isAutomatic: boolean;
}

export type MissionType = 'goto' | 'elimination' | 'delivery' | 'chase' | 'collect';

export interface MissionObjective {
  id: string;
  description: string;
  type: 'reach' | 'kill' | 'collect' | 'deliver' | 'survive' | 'timer';
  target?: string;
  position?: Vec3;
  radius?: number;
  count?: number;
  timeLimit?: number;
  completed: boolean;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  objectives: MissionObjective[];
  reward: number;
  prerequisites: string[];
  onStart?: (ctx: GameContext) => void;
  onComplete?: (ctx: GameContext) => void;
  onFail?: (ctx: GameContext) => void;
}

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: Vec3;
    health: number;
    armor: number;
    money: number;
    weaponId: string | null;
    ammo: Record<string, number>;
  };
  missions: {
    completed: string[];
    active: string | null;
    objectiveProgress: Record<string, boolean>;
  };
  wanted: {
    level: number;
  };
  settings: Record<string, unknown>;
}

export interface PickupConfig {
  type: 'health' | 'armor' | 'weapon' | 'money' | 'ammo';
  value: number | string;
  position: Vec3;
  respawnTime: number;
}

export interface MissionContext {
  playerPos: Vec3;
  playerVehicle: EntityId | null;
  isInVehicle: boolean;
  kills: Record<string, number>;
  collected: Record<string, number>;
  elapsed: number;
  playerDead: boolean;
  carryingPackage: boolean;
  missionStartTime: number;
}

export type { GameContext, EntityId, Vec3 };
