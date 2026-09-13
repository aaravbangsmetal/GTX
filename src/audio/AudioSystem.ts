import type { Camera } from 'three';
import type { EventBus } from '../shared/events';
import { vec3 } from '../shared/math';
import type { EntityId, GameContext, System, Vec3 } from '../shared/types';
import { AmbientManager } from './AmbientManager';
import { AudioManager } from './AudioManager';
import { FootstepController } from './FootstepController';
import { MusicPlayer } from './MusicPlayer';
import { RadioSystem } from './RadioSystem';
import { SFXLibrary } from './SFXLibrary';
import { SpatialAudio } from './SpatialAudio';
import type { AudioGroup } from './types';

function getCameraForward(camera: Camera): Vec3 {
  const elements = camera.matrixWorld.elements;
  return vec3(-elements[8], -elements[9], -elements[10]);
}

interface PlayerAudioReader {
  getPosition(): Vec3;
}

interface RendererAudioReader {
  getActiveCamera(): Camera;
}

export class AudioSystem implements System {
  readonly name = 'audio' as const;

  private ctx: GameContext | null = null;
  private manager!: AudioManager;
  private music!: MusicPlayer;
  private radio!: RadioSystem;
  private ambient!: AmbientManager;
  private sfx!: SFXLibrary;
  private spatial!: SpatialAudio;
  private footsteps!: FootstepController;
  private readonly engineSounds = new Map<EntityId, string>();

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;

    this.manager = new AudioManager();
    this.manager.init();
    this.manager.bindCanvasUnlock(ctx.canvas);

    this.spatial = new SpatialAudio(this.manager);
    this.music = new MusicPlayer(this.manager);
    this.radio = new RadioSystem(this.manager);
    this.radio.bindEvents(ctx.events);
    this.ambient = new AmbientManager(this.manager);
    this.sfx = new SFXLibrary(this.manager, this.spatial);
    this.sfx.bindEvents(ctx.events);
    this.footsteps = new FootstepController(this.sfx);
    this.footsteps.bindEvents(ctx.events);
    this.bindEvents(ctx.events);
    this.bindRadioInput();
  }

  private bindEvents(events: EventBus): void {
    events.on('game:ready', () => {
      this.music.start();
    });

    events.on('player:enterVehicle', () => {
      this.music.fadeOut(1000);
      this.radio.activate();
    });

    events.on('player:exitVehicle', () => {
      this.radio.deactivate();
      this.music.fadeIn(1000);
    });

    events.on('vehicle:enginePitch', ({ vehicleId, rpm, speed: _speed }) => {
      this.handleEngineSound(vehicleId, rpm);
    });

    events.on('vehicle:destroy', ({ vehicleId }) => {
      this.sfx.stopEngineForVehicle(vehicleId);
      this.engineSounds.delete(vehicleId);
    });

    events.on('audio:volumeChange', ({ group, value }) => {
      this.manager.setGroupVolume(group as AudioGroup, value);
    });

    events.on('game:pause', () => {
      this.manager.pauseAll();
    });

    events.on('game:resume', () => {
      this.manager.resumeAll();
    });

    events.on('world:playerDistrictChange', ({ district }) => {
      const isNight = this.getIsNight();
      this.ambient.setDistrict(district, isNight);
    });

    events.on('world:timeChange', ({ hour, isNight }) => {
      this.music.onTimeOfDayChange(isNight);
      this.ambient.onTimeChange(hour, isNight);
    });
  }

  private bindRadioInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'KeyR' || event.repeat) return;
      if (!this.radio.isActive()) return;
      this.radio.nextStation();
    });
  }

  private handleEngineSound(vehicleId: EntityId, rpm: number): void {
    let soundId = this.engineSounds.get(vehicleId);
    const position = this.getPlayerPosition();

    if (!soundId) {
      soundId = this.sfx.startEngine(vehicleId, position);
      this.engineSounds.set(vehicleId, soundId);
    }

    this.sfx.updateEngine(soundId, position, rpm);
  }

  private getPlayerPosition(): Vec3 {
    if (!this.ctx) return vec3();
    try {
      const player = this.ctx.getSystem('player') as System & PlayerAudioReader;
      return player.getPosition();
    } catch {
      return vec3();
    }
  }

  private getIsNight(): boolean {
    if (!this.ctx) return false;
    try {
      const renderer = this.ctx.getSystem('renderer') as System & {
        getDayNightState?: () => { isNight: boolean };
      };
      return renderer.getDayNightState?.().isNight ?? false;
    } catch {
      return false;
    }
  }

  fixedUpdate(_dt: number): void {
    // Audio runs in variable update
  }

  update(dt: number): void {
    if (!this.ctx) return;

    this.footsteps.update(dt);
    this.ambient.update(dt);

    const position = this.getPlayerPosition();
    let forward = vec3(0, 0, -1);

    try {
      const renderer = this.ctx.getSystem('renderer') as System & RendererAudioReader;
      forward = getCameraForward(renderer.getActiveCamera());
    } catch {
      // Use default forward when renderer is unavailable
    }

    this.spatial.update(dt, position, forward);
  }

  dispose(): void {
    this.music.stop();
    this.radio.deactivate();
    this.ambient.dispose();
    this.spatial.dispose();
    this.manager.dispose();
    this.engineSounds.clear();
    this.ctx = null;
  }

  getRadioSystem(): RadioSystem {
    return this.radio;
  }

  getManager(): AudioManager {
    return this.manager;
  }
}
