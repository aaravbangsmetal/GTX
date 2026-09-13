import type { AudioGroupVolumes, RadioStation } from './types';

export const AUDIO_BASE = '/assets/audio';

export const DEFAULT_VOLUMES: AudioGroupVolumes = {
  master: 1.0,
  music: 0.6,
  radio: 0.8,
  sfx: 1.0,
  ambient: 0.5,
  ui: 0.7,
};

export const MUSIC_TRACKS = {
  day: `${AUDIO_BASE}/music/theme-synthwave.mp3`,
  night: `${AUDIO_BASE}/music/theme-night.mp3`,
} as const;

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'wave103',
    name: 'Wave 103',
    tagline: 'The sound of today!',
    tracks: [
      `${AUDIO_BASE}/radio/wave103-track1.mp3`,
      `${AUDIO_BASE}/radio/wave103-track2.mp3`,
    ],
    color: '#FF6B9D',
  },
  {
    id: 'vrock',
    name: 'V-Rock',
    tagline: 'The station that rocks!',
    tracks: [`${AUDIO_BASE}/radio/vrock-track1.mp3`],
    color: '#FF4444',
  },
  {
    id: 'vcpr',
    name: 'VCPR',
    tagline: 'Public radio for Vice City',
    tracks: [`${AUDIO_BASE}/radio/vcpr-talk1.mp3`],
    color: '#44AA44',
  },
];

export const SFX_PATHS = {
  footstepConcrete: `${AUDIO_BASE}/sfx/footstep-concrete.mp3`,
  footstepGrass: `${AUDIO_BASE}/sfx/footstep-grass.mp3`,
  engineIdle: `${AUDIO_BASE}/sfx/engine-idle.mp3`,
  engineRev: `${AUDIO_BASE}/sfx/engine-rev.mp3`,
  crashMetal: `${AUDIO_BASE}/sfx/crash-metal.mp3`,
  gunshotPistol: `${AUDIO_BASE}/sfx/gunshot-pistol.mp3`,
  gunshotSmg: `${AUDIO_BASE}/sfx/gunshot-smg.mp3`,
  horn: `${AUDIO_BASE}/sfx/horn.mp3`,
  siren: `${AUDIO_BASE}/sfx/siren.mp3`,
  explosion: `${AUDIO_BASE}/sfx/explosion.mp3`,
  pickupCollect: `${AUDIO_BASE}/sfx/pickup-collect.mp3`,
  missionPass: `${AUDIO_BASE}/sfx/mission-pass.mp3`,
  missionFail: `${AUDIO_BASE}/sfx/mission-fail.mp3`,
  uiClick: `${AUDIO_BASE}/sfx/ui-click.mp3`,
  uiHover: `${AUDIO_BASE}/sfx/ui-hover.mp3`,
} as const;
