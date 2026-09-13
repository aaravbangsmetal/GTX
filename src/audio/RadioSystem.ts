import type { Howl } from 'howler';
import type { EventBus } from '../shared/events';
import { RADIO_STATIONS } from './AudioConfig';
import type { AudioManager } from './AudioManager';
import type { RadioStation } from './types';

export class RadioSystem {
  private currentStationIndex = 0;
  private currentTrackIndex = 0;
  private currentTrack: Howl | null = null;
  private currentPath: string | null = null;
  private currentSoundId = -1;
  private active = false;
  private events: EventBus | null = null;

  constructor(private readonly audio: AudioManager) {}

  bindEvents(events: EventBus): void {
    this.events = events;
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.playCurrentTrack();
    if (this.currentTrack && this.currentSoundId >= 0) {
      this.currentTrack.volume(0, this.currentSoundId);
      this.currentTrack.fade(0, 1, 500, this.currentSoundId);
    }
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    if (this.currentTrack && this.currentSoundId >= 0) {
      const vol = this.currentTrack.volume(this.currentSoundId) as number;
      this.currentTrack.fade(vol, 0, 500, this.currentSoundId);
      window.setTimeout(() => {
        this.stopCurrentTrack();
      }, 500);
    } else {
      this.stopCurrentTrack();
    }
  }

  nextStation(): void {
    this.currentStationIndex = (this.currentStationIndex + 1) % RADIO_STATIONS.length;
    this.currentTrackIndex = 0;
    this.switchStation();
  }

  previousStation(): void {
    this.currentStationIndex =
      (this.currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.currentTrackIndex = 0;
    this.switchStation();
  }

  getCurrentStation(): RadioStation {
    return RADIO_STATIONS[this.currentStationIndex];
  }

  isActive(): boolean {
    return this.active;
  }

  private switchStation(): void {
    const station = this.getCurrentStation();
    this.notifyStation(station);
    if (!this.active) return;

    this.fadeToCurrentTrack();
  }

  private fadeToCurrentTrack(): void {
    const previous = this.currentTrack;
    const previousId = this.currentSoundId;

    this.playCurrentTrack();

    if (previous && previousId >= 0) {
      const vol = previous.volume(previousId) as number;
      previous.fade(vol, 0, 400, previousId);
      window.setTimeout(() => previous.stop(previousId), 400);
    }

    if (this.currentTrack && this.currentSoundId >= 0) {
      this.currentTrack.volume(0, this.currentSoundId);
      this.currentTrack.fade(0, 1, 400, this.currentSoundId);
    }
  }

  private playCurrentTrack(): void {
    const station = this.getCurrentStation();
    const path = station.tracks[this.currentTrackIndex];
    if (!path) return;

    const howl = this.audio.loadSound(path, 'radio', { loop: false });
    const soundId = howl.play();
    if (soundId === undefined) return;

    howl.volume(1, soundId);
    howl.once('end', () => this.onTrackEnd(), soundId);

    this.currentTrack = howl;
    this.currentPath = path;
    this.currentSoundId = soundId;
  }

  private onTrackEnd(): void {
    if (!this.active) return;

    const station = this.getCurrentStation();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % station.tracks.length;
    this.fadeToCurrentTrack();
  }

  private stopCurrentTrack(): void {
    if (this.currentTrack && this.currentSoundId >= 0) {
      this.currentTrack.stop(this.currentSoundId);
    }
    this.currentTrack = null;
    this.currentPath = null;
    this.currentSoundId = -1;
  }

  private notifyStation(station: RadioStation): void {
    this.events?.emit('ui:notification', {
      text: station.name,
      type: 'info',
      duration: 2500,
    });
  }
}
