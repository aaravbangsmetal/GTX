import { Howler } from 'howler';
import { DEFAULT_VOLUMES } from './AudioConfig';
import type { AudioGroup, AudioGroupVolumes } from './types';

export class AudioManager {
  private volumes: AudioGroupVolumes = { ...DEFAULT_VOLUMES };
  private initialized = false;
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
}
