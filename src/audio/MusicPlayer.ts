import type { Howl } from 'howler';
import { MUSIC_TRACKS } from './AudioConfig';
import type { AudioManager } from './AudioManager';

export class MusicPlayer {
  private currentTrack: Howl | null = null;
  private currentPath: string | null = null;
  private currentSoundId = -1;
  private readonly playlist = [MUSIC_TRACKS.day, MUSIC_TRACKS.night];
  private trackIndex = 0;
  private isNight = false;
  private started = false;
  private targetVolume = 1;

  constructor(private readonly audio: AudioManager) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.playTrack(MUSIC_TRACKS.day, true);
  }

  stop(): void {
    if (this.currentTrack && this.currentSoundId >= 0) {
      this.currentTrack.stop(this.currentSoundId);
    }
    this.currentTrack = null;
    this.currentPath = null;
    this.currentSoundId = -1;
    this.started = false;
  }

  fadeOut(duration: number): void {
    if (!this.currentTrack || this.currentSoundId < 0) return;
    const currentVol = this.currentTrack.volume(this.currentSoundId) as number;
    this.currentTrack.fade(currentVol, 0, duration, this.currentSoundId);
  }

  fadeIn(duration: number): void {
    if (!this.started) {
      this.start();
    }
    if (!this.currentTrack || this.currentSoundId < 0) return;
    this.currentTrack.volume(0, this.currentSoundId);
    this.currentTrack.fade(0, this.targetVolume, duration, this.currentSoundId);
  }

  onTimeOfDayChange(isNight: boolean): void {
    if (this.isNight === isNight) return;
    this.isNight = isNight;
    const nextPath = isNight ? MUSIC_TRACKS.night : MUSIC_TRACKS.day;
    this.crossfadeTo(nextPath, 2000);
  }

  private crossfadeTo(path: string, duration: number): void {
    const previous = this.currentTrack;
    const previousId = this.currentSoundId;

    this.playTrack(path, true);

    if (previous && previousId >= 0) {
      const prevVol = previous.volume(previousId) as number;
      previous.fade(prevVol, 0, duration, previousId);
      window.setTimeout(() => {
        previous.stop(previousId);
      }, duration);
    }
  }

  private playTrack(path: string, loop: boolean): void {
    const howl = this.audio.loadSound(path, 'music', { loop });
    const soundId = howl.play();
    if (soundId === undefined) return;

    howl.volume(this.targetVolume, soundId);
    howl.loop(loop, soundId);

    this.currentTrack = howl;
    this.currentPath = path;
    this.currentSoundId = soundId;
    this.trackIndex = this.playlist.indexOf(path as (typeof this.playlist)[number]);
  }
}
