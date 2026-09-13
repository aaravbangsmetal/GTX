import type { EventBus } from '../shared/events';
import type { EntityId, Vec3 } from '../shared/types';
import { SFX_PATHS } from './AudioConfig';
import type { AudioManager } from './AudioManager';
import type { SpatialAudio } from './SpatialAudio';
import type { FootstepSurface } from './types';

const MAX_ENGINE_RPM = 8000;

export class SFXLibrary {
  private readonly engineSounds = new Map<EntityId, string>();

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

  playGunshot(position: Vec3, weapon: 'pistol' | 'smg'): void {
    const path = weapon === 'smg' ? SFX_PATHS.gunshotSmg : SFX_PATHS.gunshotPistol;
    this.spatial.playAt(path, position, { maxDistance: 80, volume: 0.9 });
  }

  playCrash(position: Vec3, intensity: number): void {
    const volume = Math.min(1, 0.4 + intensity * 0.08);
    this.spatial.playAt(SFX_PATHS.crashMetal, position, { maxDistance: 60, volume });
  }

  playHorn(position: Vec3): void {
    this.spatial.playAt(SFX_PATHS.horn, position, { maxDistance: 70, volume: 0.8 });
  }

  playSiren(position: Vec3): void {
    this.spatial.playAt(SFX_PATHS.siren, position, { maxDistance: 100, volume: 0.85 });
  }

  startEngine(vehicleId: EntityId, position: Vec3): string {
    const existing = this.engineSounds.get(vehicleId);
    if (existing) {
      this.spatial.updateSoundPosition(existing, position);
      return existing;
    }

    const soundId = this.spatial.playAt(SFX_PATHS.engineIdle, position, {
      loop: true,
      maxDistance: 40,
      volume: 0.35,
    });
    this.engineSounds.set(vehicleId, soundId);
    return soundId;
  }

  updateEngine(soundId: string, position: Vec3, rpm: number): void {
    this.spatial.updateSoundPosition(soundId, position);
    const normalized = Math.max(0, Math.min(1, rpm / MAX_ENGINE_RPM));
    const pitch = 0.5 + normalized * 1.5;
    const volume = 0.3 + normalized * 0.7;
    this.spatial.setSoundRate(soundId, pitch);
    this.spatial.setSoundVolume(soundId, volume);
  }

  stopEngine(soundId: string): void {
    this.spatial.stop(soundId);
    for (const [vehicleId, id] of this.engineSounds.entries()) {
      if (id === soundId) {
        this.engineSounds.delete(vehicleId);
        break;
      }
    }
  }

  stopEngineForVehicle(vehicleId: EntityId): void {
    const soundId = this.engineSounds.get(vehicleId);
    if (soundId) {
      this.stopEngine(soundId);
    }
  }

  bindEvents(events: EventBus): void {
    events.on('combat:shoot', ({ origin, weaponId }) => {
      const weapon = weaponId.includes('smg') ? 'smg' : 'pistol';
      this.playGunshot(origin, weapon);
    });

    events.on('physics:collision', ({ point, impulse }) => {
      if (impulse > 5) {
        this.playCrash(point, impulse);
      }
    });

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
