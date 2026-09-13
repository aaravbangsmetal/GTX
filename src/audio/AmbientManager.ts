import type { Howl } from 'howler';
import type { DistrictId } from '../shared/types';
import { TIME_AMBIENT_LAYERS } from './AudioConfig';
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
  private hour = 12;

  constructor(private readonly audio: AudioManager) {}

  setDistrict(district: DistrictId, isNight: boolean): void {
    if (this.currentDistrict === district && this.isNight === isNight) return;

    this.isNight = isNight;
    this.currentDistrict = district;
    this.crossfadeToDistrict(district);
  }

  onTimeChange(hour: number, isNight: boolean): void {
    this.hour = hour;
    const nightChanged = this.isNight !== isNight;
    this.isNight = isNight;

    if (nightChanged && this.currentDistrict !== null) {
      this.refreshTimeLayers();
    }
  }

  update(_dt: number): void {
    // Ambient loops are self-sustaining; time layers refresh on events.
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
    const timeLayers = this.getTimeLayers();

    window.setTimeout(() => {
      this.stopList(previous);
      this.activeAmbient = [];
      for (const sound of [...sounds, ...timeLayers]) {
        this.fadeInAmbient(sound, 2000);
      }
    }, 2000);
  }

  private refreshTimeLayers(): void {
    const toRemove = this.activeAmbient.filter((ambient) =>
      this.isTimeLayerPath(ambient.path),
    );

    this.fadeOutList(toRemove, 1500);
    window.setTimeout(() => {
      this.stopList(toRemove);
      this.activeAmbient = this.activeAmbient.filter((ambient) => !toRemove.includes(ambient));
      for (const layer of this.getTimeLayers()) {
        if (!this.activeAmbient.some((ambient) => ambient.path === layer.path)) {
          this.fadeInAmbient(layer, 1500);
        }
      }
    }, 1500);
  }

  private getTimeLayers(): AmbientSoundDef[] {
    const layers: AmbientSoundDef[] = [];
    if (this.isNight) {
      layers.push(TIME_AMBIENT_LAYERS.crickets);
    }
    if (this.hour >= 5 && this.hour <= 8) {
      layers.push(TIME_AMBIENT_LAYERS.birds);
    }
    return layers;
  }

  private isTimeLayerPath(path: string): boolean {
    return (
      path === TIME_AMBIENT_LAYERS.crickets.path || path === TIME_AMBIENT_LAYERS.birds.path
    );
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
