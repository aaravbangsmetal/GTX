import { Howl, Howler } from 'howler';
import { DEFAULT_VOLUMES } from './AudioConfig';
import type { AudioGroup, AudioGroupVolumes } from './types';

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
}
