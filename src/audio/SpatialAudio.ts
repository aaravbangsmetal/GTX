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

  dispose(): void {
    for (const sound of this.activeSounds.values()) {
      sound.howl.stop(sound.soundId);
    }
    this.activeSounds.clear();
  }
}
