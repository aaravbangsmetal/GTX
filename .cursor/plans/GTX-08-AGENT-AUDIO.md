# Agent 8: Audio and Atmosphere

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 8 |
| Branch | `agent-08-audio` |
| Owns | `src/audio/`, `public/assets/audio/` |
| Merge order | Wave 2 |
| Wave | 2 |

---

## Central Context

GTX is a browser GTA Vice City game. Wave 1 merged. **You own all sound** — 80s synthwave soundtrack, in-car radio, spatial SFX, zone-based ambient, and Vice City atmosphere. Audio must enhance the mood without killing performance.

Howler handles Web Audio API. No additional audio libraries.

---

## Your Mission

Build complete audio system: music player, 3-station radio, spatial 3D sounds, zone ambient, SFX library, and volume management.

---

## File Checklist

```
src/audio/
  index.ts
  createSystem.ts
  types.ts
  AudioSystem.ts
  AudioManager.ts
  MusicPlayer.ts
  RadioSystem.ts
  AmbientManager.ts
  SFXLibrary.ts
  SpatialAudio.ts
  AudioZones.ts
  AudioConfig.ts
  __mocks__/
    MockGameContext.ts
public/assets/audio/
  music/
    theme-synthwave.mp3
    theme-night.mp3
  radio/
    wave103-track1.mp3
    wave103-track2.mp3
    vrock-track1.mp3
    vcpr-talk1.mp3
  sfx/
    footstep-concrete.mp3
    footstep-grass.mp3
    engine-idle.mp3
    engine-rev.mp3
    crash-metal.mp3
    gunshot-pistol.mp3
    gunshot-smg.mp3
    horn.mp3
    siren.mp3
    explosion.mp3
    pickup-collect.mp3
    mission-pass.mp3
    mission-fail.mp3
    ui-click.mp3
    ui-hover.mp3
  ambient/
    ocean-waves.mp3
    city-hum.mp3
    crickets.mp3
    birds.mp3
    industrial.mp3
    fountain.mp3
```

**Note:** Use royalty-free placeholder audio or generate simple tones for v1. Agent 8 should include a `ProceduralAudio.ts` fallback that generates basic sounds via Web Audio oscillators when files are missing.

---

## Detailed Implementation Spec

### 1. `src/audio/types.ts`

```typescript
export type AudioGroup = 'master' | 'music' | 'radio' | 'sfx' | 'ambient' | 'ui';

export interface AudioGroupVolumes {
  master: number;
  music: number;
  radio: number;
  sfx: number;
  ambient: number;
  ui: number;
}

export interface RadioStation {
  id: string;
  name: string;
  tagline: string;
  tracks: string[];  // asset paths
  color: string;     // UI display color
}

export interface SpatialSound {
  id: string;
  howl: Howl;
  position: Vec3;
  maxDistance: number;
  refDistance: number;
  loop: boolean;
}

export interface AmbientZone {
  district: DistrictId;
  sounds: Array<{ path: string; volume: number; loop: boolean }>;
  timeFilter?: { nightOnly?: boolean; dayOnly?: boolean };
}
```

### 2. `src/audio/AudioConfig.ts`

```typescript
export const DEFAULT_VOLUMES: AudioGroupVolumes = {
  master: 1.0, music: 0.6, radio: 0.8, sfx: 1.0, ambient: 0.5, ui: 0.7,
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'wave103', name: 'Wave 103', tagline: 'The sound of today!',
    tracks: ['/assets/audio/radio/wave103-track1.mp3', '...track2.mp3'],
    color: '#FF6B9D',
  },
  {
    id: 'vrock', name: 'V-Rock', tagline: 'The station that rocks!',
    tracks: ['/assets/audio/radio/vrock-track1.mp3'],
    color: '#FF4444',
  },
  {
    id: 'vcpr', name: 'VCPR', tagline: 'Public radio for Vice City',
    tracks: ['/assets/audio/radio/vcpr-talk1.mp3'],
    color: '#44AA44',
  },
];

export const AMBIENT_ZONES: AmbientZone[] = [
  { district: DistrictId.OCEAN_BEACH, sounds: [{ path: '.../ocean-waves.mp3', volume: 0.7, loop: true }] },
  { district: DistrictId.DOWNTOWN, sounds: [{ path: '.../city-hum.mp3', volume: 0.4, loop: true }] },
  { district: DistrictId.VICE_PORT, sounds: [{ path: '.../industrial.mp3', volume: 0.5, loop: true }] },
  { district: DistrictId.STARFISH_ISLAND, sounds: [{ path: '.../fountain.mp3', volume: 0.3, loop: true }] },
];
```

### 3. `src/audio/AudioManager.ts`

```typescript
import { Howl, Howler } from 'howler';

export class AudioManager {
  private volumes: AudioGroupVolumes;
  private sounds = new Map<string, Howl>();

  init(): void;
  // Howler.ctx resume on first user interaction (browser autoplay policy)

  loadSound(path: string, group: AudioGroup): Howl;
  // Cache in sounds map
  // Apply group volume

  play(path: string, group: AudioGroup, options?: { loop?: boolean; volume?: number }): number;  // soundId
  stop(soundId: number): void;
  fade(soundId: number, from: number, to: number, duration: number): void;

  setGroupVolume(group: AudioGroup, value: number): void;
  getGroupVolume(group: AudioGroup): number;
  // Effective volume = groupVolume * masterVolume

  pauseAll(): void;
  resumeAll(): void;
}
```

### 4. `src/audio/MusicPlayer.ts`

```typescript
export class MusicPlayer {
  private currentTrack: Howl | null = null;
  private playlist: string[];
  private trackIndex = 0;

  constructor(private audio: AudioManager);

  start(): void;
  // Play theme-synthwave.mp3 on loop (on foot)

  stop(): void;
  fadeOut(duration: number): void;
  fadeIn(duration: number): void;

  onTimeOfDayChange(isNight: boolean): void;
  // Crossfade to theme-night.mp3 at night

  // Listen for player:enterVehicle → fadeOut(1s)
  // Listen for player:exitVehicle → fadeIn(1s)
}
```

### 5. `src/audio/RadioSystem.ts`

```typescript
export class RadioSystem {
  private currentStation = 0;
  private currentTrack: Howl | null = null;
  private active = false;

  constructor(private audio: AudioManager);

  activate(): void;
  // Start playing current station, fadeIn 0.5s

  deactivate(): void;
  // Stop, fadeOut 0.5s

  nextStation(): void;
  // Cycle: Wave 103 → V-Rock → VCPR → Wave 103
  // Fade out current, play first track of next station
  // Emit ui:notification { text: "V-Rock", type: "info" }

  previousStation(): void;

  getCurrentStation(): RadioStation;

  // R key → nextStation() (listen via events or input)
  // When track ends → play next track in station playlist
  // When playlist ends → loop to first track
}
```

### 6. `src/audio/SpatialAudio.ts`

```typescript
export class SpatialAudio {
  private activeSounds = new Map<string, SpatialSound>();

  constructor(private audio: AudioManager);

  playAt(path: string, position: Vec3, options?: {
    maxDistance?: number;  // default 50
    refDistance?: number;  // default 1
    loop?: boolean;
    volume?: number;
  }): string;  // sound instance id

  stop(id: string): void;
  updateListener(position: Vec3, forward: Vec3, up: Vec3): void;
  // Howler.pos(x, y, z) for listener
  // Howler.orientation(forward, up)

  updateSoundPosition(id: string, position: Vec3): void;
  // Howl.pos(x, y, z) for sound source

  update(dt: number, listenerPos: Vec3, listenerForward: Vec3): void;
  // Update all active spatial sound positions
  // Update listener
}
```

### 7. `src/audio/SFXLibrary.ts`

```typescript
export class SFXLibrary {
  constructor(private audio: AudioManager, private spatial: SpatialAudio);

  // One-shot SFX (non-spatial):
  playFootstep(surface: 'concrete' | 'grass' | 'metal'): void;
  playUIClick(): void;
  playUIHover(): void;
  playMissionPass(): void;
  playMissionFail(): void;
  playPickup(): void;
  playExplosion(): void;

  // Spatial SFX:
  playGunshot(position: Vec3, weapon: 'pistol' | 'smg'): void;
  playCrash(position: Vec3, intensity: number): void;
  playHorn(position: Vec3): void;
  playSiren(position: Vec3): void;

  // Continuous spatial (managed):
  startEngine(vehicleId: EntityId, position: Vec3): string;
  updateEngine(soundId: string, position: Vec3, rpm: number): void;
  stopEngine(soundId: string): void;
  // Pitch = 0.5 + (rpm / maxRpm) * 1.5
  // Volume = 0.3 + (rpm / maxRpm) * 0.7

  // Event bindings:
  bindEvents(events: EventBus): void;
  // combat:shoot → playGunshot
  // physics:collision (impulse > 5) → playCrash
  // vehicle:enginePitch → updateEngine
  // pickup:collected → playPickup
  // mission:complete → playMissionPass
  // mission:fail → playMissionFail
  // ai:npcDeath → (no special sound, handled by combat:hit)
}
```

### 8. `src/audio/AmbientManager.ts`

```typescript
export class AmbientManager {
  private currentZone: DistrictId | null = null;
  private activeAmbient: Howl[] = [];

  constructor(private audio: AudioManager);

  setDistrict(district: DistrictId, isNight: boolean): void;
  // Crossfade: fadeOut current ambient (2s), fadeIn new zone ambient (2s)
  // Apply timeFilter: crickets at night, birds at dawn

  update(dt: number): void;

  // Listen for world:playerDistrictChange → setDistrict
  // Listen for world:timeChange → update time-based ambient layers
}
```

### 9. `src/audio/AudioZones.ts`
Re-export from AudioConfig. Map district → ambient sounds. Used by AmbientManager.

### 10. `src/audio/ProceduralAudio.ts` (Fallback)

```typescript
export class ProceduralAudio {
  static createTone(frequency: number, duration: number, type: OscillatorType): Howl;
  // For missing assets: generate simple tones
  // gunshot: short noise burst
  // engine: low oscillator with pitch modulation
  // footstep: short low thud
  // explosion: noise sweep
}
```

### 11. `src/audio/AudioSystem.ts`

```typescript
export class AudioSystem implements System {
  name = 'audio' as const;

  private manager: AudioManager;
  private music: MusicPlayer;
  private radio: RadioSystem;
  private ambient: AmbientManager;
  private sfx: SFXLibrary;
  private spatial: SpatialAudio;
  private engineSounds = new Map<EntityId, string>();

  async init(ctx: GameContext): Promise<void> {
    this.manager = new AudioManager();
    this.manager.init();
    this.spatial = new SpatialAudio(this.manager);
    this.music = new MusicPlayer(this.manager);
    this.radio = new RadioSystem(this.manager);
    this.ambient = new AmbientManager(this.manager);
    this.sfx = new SFXLibrary(this.manager, this.spatial);
    this.sfx.bindEvents(ctx.events);

    // Resume audio context on first click
    ctx.canvas.addEventListener('click', () => Howler.ctx?.resume());

    ctx.events.on('game:ready', () => this.music.start());
    ctx.events.on('player:enterVehicle', () => {
      this.music.fadeOut(1);
      this.radio.activate();
    });
    ctx.events.on('player:exitVehicle', () => {
      this.radio.deactivate();
      this.music.fadeIn(1);
    });
    ctx.events.on('vehicle:enginePitch', ({ vehicleId, rpm, speed }) => {
      this.handleEngineSound(vehicleId, rpm, speed);
    });
    ctx.events.on('audio:volumeChange', ({ group, value }) => {
      this.manager.setGroupVolume(group as AudioGroup, value);
    });
    ctx.events.on('game:pause', () => this.manager.pauseAll());
    ctx.events.on('game:resume', () => this.manager.resumeAll());
  }

  update(dt: number): void {
    const player = ctx.getSystem('player');
    const pos = player.getPosition();
    const camera = ctx.getSystem('renderer').getActiveCamera();
    const forward = getCameraForward(camera);
    this.spatial.updateListener(pos, forward, vec3(0, 1, 0));
    this.spatial.update(dt, pos, forward);
  }
}
```

---

## Footstep System

```typescript
// In SFXLibrary or separate FootstepController:
// Listen for player:move
// If isGrounded && speed > 0.5:
//   Every 0.4s (walk) or 0.25s (run): playFootstep
//   Surface detection: raycast down, check material (concrete default)
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| Full game soundscape | player experience |
| `audio:volumeChange` handling | 9 (settings) |
| Radio station info | 9 (RadioUI) |

| You Consume | From |
|-------------|------|
| All gameplay events (see event catalog) | 1, 5, 6, 7, 10 |
| `world:playerDistrictChange` | 3 |
| `world:timeChange` | 2 |
| Player position (listener) | 5 |
| Camera forward (listener orientation) | 2/5 |

---

## Acceptance Criteria

- [ ] Background synthwave music plays on foot
- [ ] Music fades out when entering vehicle, radio fades in
- [ ] R key cycles radio stations (Wave 103 → V-Rock → VCPR)
- [ ] Engine sound follows vehicle, pitch changes with speed
- [ ] Gunshot sound plays at shoot position (3D spatial)
- [ ] Ocean waves ambient at beach, city hum downtown
- [ ] Ambient crossfades when changing districts
- [ ] Night ambient adds crickets, day adds birds
- [ ] Mission complete/fail sounds play
- [ ] Volume settings work (master, music, sfx, ambient)
- [ ] Audio pauses on game pause
- [ ] Procedural fallback works when audio files missing
- [ ] `npm run build` passes

---

## DO NOT

- Build UI for radio display (Agent 9) — only provide station data
- Handle input directly for R key — listen for event or read from player system
- Edit folders outside `src/audio/` and `public/assets/audio/`
