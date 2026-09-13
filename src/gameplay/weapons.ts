import type { WeaponConfig } from './types';

export const WEAPONS: Record<string, WeaponConfig> = {
  fists: {
    id: 'fists',
    name: 'Fists',
    type: 'melee',
    damage: 10,
    range: 2,
    fireRate: 2,
    magazineSize: 0,
    reloadTime: 0,
    spread: 0,
    isAutomatic: false,
  },
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    type: 'pistol',
    damage: 25,
    range: 50,
    fireRate: 3,
    magazineSize: 12,
    reloadTime: 1.5,
    spread: 0.02,
    isAutomatic: false,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    type: 'smg',
    damage: 15,
    range: 40,
    fireRate: 10,
    magazineSize: 30,
    reloadTime: 2.0,
    spread: 0.05,
    isAutomatic: true,
  },
};

export const DEFAULT_WEAPON_ID = 'fists';
