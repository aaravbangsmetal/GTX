import { Howl, Howler } from 'howler';
import { DEFAULT_VOLUMES } from './AudioConfig';
import { ProceduralAudio } from './ProceduralAudio';
import type { AudioGroup, AudioGroupVolumes, PlayOptions } from './types';

interface LoadedSound {
  howl: Howl;
  group: AudioGroup;
}

export class AudioManager {
  private volumes: AudioGroupVolumes = { ...DEFAULT_VOLUMES };
  private sounds = new Map<string, LoadedSound>();
  private initialized = false;
  private paused = false;
  private unlockBound = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    Howler.autoUnlock = true;
    Howler.volume(this.volumes.master);
    this.bindUnlockHandlers();
  }

  private bindUnlockHandlers(): void {
    if (this.unlockBound) return;
    this.unlockBound = true;

    const resume = () => {
      void Howler.ctx?.resume();
    };

    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  bindCanvasUnlock(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('click', () => {
      void Howler.ctx?.resume();
    });
  }

  private effectiveVolume(group: AudioGroup, localVolume = 1): number {
    if (group === 'master') {
      return this.volumes.master * localVolume;
    }
    return this.volumes.master * this.volumes[group] * localVolume;
  }

  setGroupVolume(group: AudioGroup, value: number): void {
    this.volumes[group] = Math.max(0, Math.min(1, value));
    if (group === 'master') {
      Howler.volume(this.volumes.master);
    }
    this.refreshLoadedVolumes();
  }

  getGroupVolume(group: AudioGroup): number {
    return this.volumes[group];
  }

  getVolumes(): AudioGroupVolumes {
    return { ...this.volumes };
  }

  private refreshLoadedVolumes(): void {
    for (const { howl, group } of this.sounds.values()) {
      howl.volume(this.effectiveVolume(group));
    }
  }

  loadSound(path: string, group: AudioGroup, options?: { loop?: boolean; spatial?: boolean }): Howl {
    const cached = this.sounds.get(path);
    if (cached) {
      return cached.howl;
    }

    const spatial = options?.spatial ?? false;
    const howl = new Howl({
      src: [path],
      loop: options?.loop ?? false,
      volume: this.effectiveVolume(group),
      preload: true,
      html5: false,
      onloaderror: () => {
        const fallback = ProceduralAudio.createForPath(path);
        fallback.volume(this.effectiveVolume(group));
        this.sounds.set(path, { howl: fallback, group });
      },
      ...(spatial
        ? {
            onload: () => {
              howl.pannerAttr({
                panningModel: 'equalpower',
                refDistance: 1,
                maxDistance: 50,
                rolloffFactor: 1,
              });
            },
          }
        : {}),
    });

    this.sounds.set(path, { howl, group });
    return howl;
  }

  play(path: string, group: AudioGroup, options?: PlayOptions): number {
    const howl = this.loadSound(path, group, {
      loop: options?.loop,
      spatial: options?.spatial,
    });

    const volume = this.effectiveVolume(group, options?.volume ?? 1);
    const soundId = howl.play();

    if (soundId !== undefined) {
      howl.volume(volume, soundId);
      if (options?.spatial && options.position) {
        howl.pos(options.position.x, options.position.y, options.position.z, soundId);
        howl.pannerAttr(
          {
            refDistance: options.refDistance ?? 1,
            maxDistance: options.maxDistance ?? 50,
          },
          soundId,
        );
      }
    }

    return soundId ?? -1;
  }

  stop(soundId: number, path?: string): void {
    if (soundId < 0) return;
    if (path) {
      const loaded = this.sounds.get(path);
      loaded?.howl.stop(soundId);
      return;
    }
    for (const { howl } of this.sounds.values()) {
      howl.stop(soundId);
    }
  }

  stopPath(path: string): void {
    const loaded = this.sounds.get(path);
    loaded?.howl.stop();
  }

  fade(soundId: number, from: number, to: number, duration: number, path?: string): void {
    if (soundId < 0) return;
    const howl = path ? this.sounds.get(path)?.howl : this.findHowlBySoundId(soundId);
    if (!howl) return;
    howl.fade(from, to, duration, soundId);
  }

  fadePath(path: string, from: number, to: number, duration: number): void {
    const loaded = this.sounds.get(path);
    if (!loaded) return;
    loaded.howl.fade(from, to, duration);
  }

  private findHowlBySoundId(soundId: number): Howl | null {
    for (const { howl } of this.sounds.values()) {
      if (howl.playing(soundId)) {
        return howl;
      }
    }
    return null;
  }

  pauseAll(): void {
    if (this.paused) return;
    this.paused = true;
    Howler.mute(true);
  }

  resumeAll(): void {
    if (!this.paused) return;
    this.paused = false;
    Howler.mute(false);
  }

  dispose(): void {
    for (const { howl } of this.sounds.values()) {
      howl.unload();
    }
    this.sounds.clear();
    Howler.unload();
  }
}
