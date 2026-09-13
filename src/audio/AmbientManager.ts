import type { Howl } from 'howler';
import type { DistrictId } from '../shared/types';
import { getAmbientZone } from './AudioZones';
import type { AudioManager } from './AudioManager';
import type { AmbientSoundDef } from './types';

interface ActiveAmbient {
  howl: Howl;
  soundId: number;
  path: string;
}

export class AmbientManager {
  private currentDistrict: DistrictId | null = null;
  private activeAmbient: ActiveAmbient[] = [];
  private isNight = false;

  constructor(private readonly audio: AudioManager) {}

  setDistrict(district: DistrictId, isNight: boolean): void {
    if (this.currentDistrict === district && this.isNight === isNight) return;

    this.isNight = isNight;
    this.currentDistrict = district;
    this.crossfadeToDistrict(district);
  }

  update(_dt: number): void {
    // Ambient loops are self-sustaining.
  }

  dispose(): void {
    this.fadeOutActive(0);
    this.activeAmbient = [];
    this.currentDistrict = null;
  }

  private crossfadeToDistrict(district: DistrictId): void {
    const previous = [...this.activeAmbient];
    this.fadeOutList(previous, 2000);

    const zone = getAmbientZone(district);
    const sounds = zone?.sounds ?? [];

    window.setTimeout(() => {
      this.stopList(previous);
      this.activeAmbient = [];
      for (const sound of sounds) {
        this.fadeInAmbient(sound, 2000);
      }
    }, 2000);
  }

  private fadeInAmbient(def: AmbientSoundDef, duration: number): void {
    const howl = this.audio.loadSound(def.path, 'ambient', { loop: def.loop });
    const soundId = howl.play();
    if (soundId === undefined) return;

    const targetVolume = def.volume;
    howl.volume(0, soundId);
    howl.fade(0, targetVolume, duration, soundId);

    this.activeAmbient.push({ howl, soundId, path: def.path });
  }

  private fadeOutActive(duration: number): void {
    this.fadeOutList(this.activeAmbient, duration);
  }

  private fadeOutList(list: ActiveAmbient[], duration: number): void {
    for (const ambient of list) {
      const vol = ambient.howl.volume(ambient.soundId) as number;
      ambient.howl.fade(vol, 0, duration, ambient.soundId);
    }
  }

  private stopList(list: ActiveAmbient[]): void {
    for (const ambient of list) {
      ambient.howl.stop(ambient.soundId);
    }
  }
}
