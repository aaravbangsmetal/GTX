import type { EventBus } from '../shared/events';
import { SFX_PATHS } from './AudioConfig';
import type { AudioManager } from './AudioManager';
import type { SpatialAudio } from './SpatialAudio';
import type { FootstepSurface } from './types';

export class SFXLibrary {
  constructor(
    private readonly audio: AudioManager,
    private readonly spatial: SpatialAudio,
  ) {}

  playFootstep(surface: FootstepSurface): void {
    const path =
      surface === 'grass' ? SFX_PATHS.footstepGrass : SFX_PATHS.footstepConcrete;
    this.audio.play(path, 'sfx', { volume: 0.5 });
  }

  playUIClick(): void {
    this.audio.play(SFX_PATHS.uiClick, 'ui');
  }

  playUIHover(): void {
    this.audio.play(SFX_PATHS.uiHover, 'ui', { volume: 0.6 });
  }

  playMissionPass(): void {
    this.audio.play(SFX_PATHS.missionPass, 'sfx');
  }

  playMissionFail(): void {
    this.audio.play(SFX_PATHS.missionFail, 'sfx');
  }

  playPickup(): void {
    this.audio.play(SFX_PATHS.pickupCollect, 'sfx');
  }

  playExplosion(): void {
    this.audio.play(SFX_PATHS.explosion, 'sfx');
  }

  bindEvents(events: EventBus): void {
    events.on('pickup:collected', () => {
      this.playPickup();
    });

    events.on('mission:complete', () => {
      this.playMissionPass();
    });

    events.on('mission:fail', () => {
      this.playMissionFail();
    });
  }
}
