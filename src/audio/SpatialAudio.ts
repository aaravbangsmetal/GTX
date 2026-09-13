import { Howler } from 'howler';
import { normalize3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import type { AudioManager } from './AudioManager';
import type { SpatialSound } from './types';

let spatialInstanceCounter = 0;

export class SpatialAudio {
  private readonly activeSounds = new Map<string, SpatialSound>();

  constructor(private readonly audio: AudioManager) {}

  playAt(
    path: string,
    position: Vec3,
    options?: {
      maxDistance?: number;
      refDistance?: number;
      loop?: boolean;
      volume?: number;
    },
  ): string {
    const id = `spatial_${spatialInstanceCounter++}`;
    const howl = this.audio.loadSound(path, 'sfx', { loop: options?.loop ?? false, spatial: true });
    const soundId = howl.play();

    if (soundId === undefined) {
      return id;
    }

    const maxDistance = options?.maxDistance ?? 50;
    const refDistance = options?.refDistance ?? 1;
    const volume = options?.volume ?? 1;

    howl.pos(position.x, position.y, position.z, soundId);
    howl.pannerAttr({ refDistance, maxDistance }, soundId);
    howl.volume(volume, soundId);

    this.activeSounds.set(id, {
      id,
      howl,
      soundId,
      position: { ...position },
      maxDistance,
      refDistance,
      loop: options?.loop ?? false,
    });

    if (!options?.loop) {
      howl.once('end', () => this.activeSounds.delete(id), soundId);
    }

    return id;
  }

  stop(id: string): void {
    const sound = this.activeSounds.get(id);
    if (!sound) return;
    sound.howl.stop(sound.soundId);
    this.activeSounds.delete(id);
  }

  updateSoundPosition(id: string, position: Vec3): void {
    const sound = this.activeSounds.get(id);
    if (!sound) return;
    sound.position = { ...position };
    sound.howl.pos(position.x, position.y, position.z, sound.soundId);
  }

  setSoundRate(id: string, rate: number): void {
    const sound = this.activeSounds.get(id);
    if (!sound) return;
    sound.howl.rate(rate, sound.soundId);
  }

  setSoundVolume(id: string, volume: number): void {
    const sound = this.activeSounds.get(id);
    if (!sound) return;
    sound.howl.volume(volume, sound.soundId);
  }

  updateListener(position: Vec3, forward: Vec3, up: Vec3): void {
    Howler.pos(position.x, position.y, position.z);
    const f = normalize3(forward);
    const u = normalize3(up);
    Howler.orientation(f.x, f.y, f.z, u.x, u.y, u.z);
  }

  update(_dt: number, listenerPos: Vec3, listenerForward: Vec3): void {
    const up = { x: 0, y: 1, z: 0 };
    this.updateListener(listenerPos, listenerForward, up);
  }

  dispose(): void {
    for (const sound of this.activeSounds.values()) {
      sound.howl.stop(sound.soundId);
    }
    this.activeSounds.clear();
  }
}
