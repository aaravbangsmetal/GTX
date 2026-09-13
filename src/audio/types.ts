import type { Howl } from 'howler';
import type { DistrictId, EntityId, Vec3 } from '../shared/types';

export type AudioGroup = 'master' | 'music' | 'radio' | 'sfx' | 'ambient' | 'ui';

export interface AudioGroupVolumes {
  master: number;
  music: number;
  radio: number;
  sfx: number;
  ambient: number;
  ui: number;
}

export interface RadioStation {
  id: string;
  name: string;
  tagline: string;
  tracks: string[];
  color: string;
}

export interface SpatialSound {
  id: string;
  howl: Howl;
  soundId: number;
  position: Vec3;
  maxDistance: number;
  refDistance: number;
  loop: boolean;
}

export interface AmbientSoundDef {
  path: string;
  volume: number;
  loop: boolean;
  nightOnly?: boolean;
  dayOnly?: boolean;
  dawnOnly?: boolean;
}

export interface AmbientZone {
  district: DistrictId;
  sounds: AmbientSoundDef[];
}

export interface PlayOptions {
  loop?: boolean;
  volume?: number;
  spatial?: boolean;
  position?: Vec3;
  maxDistance?: number;
  refDistance?: number;
}

export interface EngineSoundState {
  vehicleId: EntityId;
  soundId: string;
  howl: Howl;
  howlId: number;
}

export type FootstepSurface = 'concrete' | 'grass' | 'metal';
