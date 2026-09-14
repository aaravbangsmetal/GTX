import type { EventBus } from '../shared/events';
import type { IPlayerService, IWorldService, MinimapData } from '../shared/services';
import type { GameContext, System } from '../shared/types';
import { HUD } from './HUD';
import { InteractionPrompt } from './InteractionPrompt';
import { LoadingScreen } from './LoadingScreen';
import { Minimap } from './Minimap';
import { MissionText } from './MissionText';
import { NotificationSystem } from './NotificationSystem';
import { PauseMenu } from './PauseMenu';
import { RadioUI } from './RadioUI';
import { SettingsPanel } from './SettingsPanel';
import { Speedometer } from './Speedometer';
import { loadGoogleFonts } from './UITheme';
import { WantedDisplay } from './WantedDisplay';
import type { MinimapBlip, RadioStationInfo } from './types';

import './styles/hud.css';
import './styles/minimap.css';
import './styles/menu.css';
import './styles/notifications.css';

const RADIO_STATIONS: Record<string, RadioStationInfo> = {
  'Wave 103': { id: 'wave103', name: 'Wave 103', tagline: 'The sound of today!', color: '#FF6B9D' },
  'V-Rock': { id: 'vrock', name: 'V-Rock', tagline: 'The station that rocks!', color: '#FF4444' },
  VCPR: { id: 'vcpr', name: 'VCPR', tagline: 'Public radio for Vice City', color: '#44AA44' },
};

export class UISystem implements System {
  readonly name = 'ui' as const;

  private ctx!: GameContext;
  private uiRoot!: HTMLDivElement;
  private hud!: HUD;
  private minimap!: Minimap;
  private speedometer!: Speedometer;
  private wanted!: WantedDisplay;
  private interaction!: InteractionPrompt;
  private mission!: MissionText;
  private notifications!: NotificationSystem;
  private radio!: RadioUI;
  private pauseMenu!: PauseMenu;
  private settings!: SettingsPanel;
  private loading!: LoadingScreen;

  private vehicleSpeed = 0;
  private playerHeading = 0;
  private missionBlips: MinimapBlip[] = [];
  private inVehicle = false;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;

    loadGoogleFonts();

    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    document.body.appendChild(this.uiRoot);

    this.hud = new HUD(this.uiRoot);
    this.minimap = new Minimap(this.uiRoot);
    this.speedometer = new Speedometer(this.uiRoot);
    this.wanted = new WantedDisplay(this.uiRoot);
    this.interaction = new InteractionPrompt(this.uiRoot);
    this.mission = new MissionText(this.uiRoot);
    this.notifications = new NotificationSystem(this.uiRoot);
    this.radio = new RadioUI(this.uiRoot);
    this.pauseMenu = new PauseMenu(this.uiRoot, ctx.events);
    this.settings = new SettingsPanel(this.uiRoot, ctx.events);
    this.loading = new LoadingScreen();

    this.loading.bindAssets(ctx.assets);
    this.loading.bindEvents(ctx.events);

    this.pauseMenu.setSettingsHandler(() => this.settings.show());
    this.settings.setChangeHandler((settings) => this.applySettings(settings));

    this.applySettings(this.settings.getSettings());
    this.bindEvents(ctx.events);
  }

  fixedUpdate(_dt: number): void {
    // UI updates on render tick
  }

  update(dt: number): void {
    const player = this.getPlayerService();
    const state = player.getState();

    this.hud.update({
      health: state.health,
      armor: state.armor,
      money: state.money,
      weaponId: state.weaponId,
      weaponAmmo: 0,
      wantedLevel: state.wantedLevel,
      isInVehicle: state.isInVehicle,
      vehicleSpeed: this.vehicleSpeed,
      radioStation: null,
      missionObjective: null,
      interactionPrompt: null,
    });

    this.wanted.update(state.wantedLevel);

    const minimapData = this.getMinimapData();
    this.minimap.render(player.getPosition(), this.playerHeading, minimapData, this.missionBlips);

    this.notifications.update(dt);
  }

  dispose(): void {
    this.minimap.dispose();
    this.pauseMenu.dispose();
    this.radio.dispose();
    this.uiRoot.remove();
  }

  private bindEvents(events: EventBus): void {
    events.on('game:ready', () => this.loading.hide());

    events.on('player:stateChange', ({ state }) => {
      this.inVehicle = state.isInVehicle;
    });

    events.on('player:move', ({ velocity }) => {
      const speed = Math.hypot(velocity.x, velocity.z);
      if (speed > 0.1) {
        this.playerHeading = Math.atan2(velocity.x, velocity.z);
      }
    });

    events.on('player:enterVehicle', () => {
      this.inVehicle = true;
      this.speedometer.show();
      this.speedometer.update(0);
    });

    events.on('player:exitVehicle', () => {
      this.inVehicle = false;
      this.speedometer.hide();
      this.radio.hide();
    });

    events.on('vehicle:speedChange', ({ speedKmh }) => {
      this.vehicleSpeed = speedKmh;
      if (this.inVehicle) {
        this.speedometer.update(speedKmh);
      }
    });

    events.on('wanted:levelChange', ({ level }) => {
      this.wanted.update(level);
    });

    events.on('player:interactPrompt', ({ text }) => {
      if (text) {
        this.interaction.show(text);
      } else {
        this.interaction.hide();
      }
    });

    events.on('mission:start', ({ title, objective }) => {
      this.mission.showMission(title, objective);
    });

    events.on('mission:update', ({ objective }) => {
      this.mission.updateObjective(objective);
    });

    events.on('mission:complete', ({ reward }) => {
      this.mission.hide();
      this.missionBlips = [];
      this.notifications.show(`MISSION PASSED! +$${reward}`, 'success', 4000);
    });

    events.on('mission:fail', ({ reason }) => {
      this.mission.hide();
      this.notifications.show(reason ? `MISSION FAILED: ${reason}` : 'MISSION FAILED!', 'error', 4000);
    });

    events.on('ui:notification', ({ text, type, duration }) => {
      if (this.inVehicle && type === 'info' && RADIO_STATIONS[text]) {
        this.radio.show(RADIO_STATIONS[text]);
        return;
      }
      this.notifications.show(text, type, duration);
    });

    events.on('player:death', () => {
      this.notifications.show('WASTED', 'error', 3000);
    });

    events.on('save:complete', ({ slot }) => {
      this.notifications.show(`Game saved to slot ${slot + 1}`, 'success', 2500);
    });
  }

  private applySettings(settings: ReturnType<SettingsPanel['getSettings']>): void {
    this.hud.setScale(settings.hudScale);
    if (settings.showHUD) {
      this.hud.show();
    } else {
      this.hud.hide();
    }

    if (settings.showMinimap) {
      this.minimap.show();
    } else {
      this.minimap.hide();
    }

    this.ctx.events.emit('audio:volumeChange', { group: 'master', value: settings.masterVolume / 100 });
    this.ctx.events.emit('audio:volumeChange', { group: 'music', value: settings.musicVolume / 100 });
    this.ctx.events.emit('audio:volumeChange', { group: 'sfx', value: settings.sfxVolume / 100 });
    this.ctx.events.emit('audio:volumeChange', { group: 'ambient', value: settings.ambientVolume / 100 });
  }

  private getPlayerService(): IPlayerService {
    return this.ctx.getSystem('player') as unknown as IPlayerService;
  }

  private getMinimapData(): MinimapData & {
    roads: Array<{ points: Array<{ x: number; z: number }>; width: number; type: string }>;
    districts: Array<{ polygon: Array<{ x: number; z: number }>; color: string }>;
    waterBoundary: Array<{ x: number; z: number }>;
  } {
    try {
      const world = this.ctx.getSystem('world') as unknown as IWorldService;
      return world.getMinimapData() as MinimapData & {
        roads: Array<{ points: Array<{ x: number; z: number }>; width: number; type: string }>;
        districts: Array<{ polygon: Array<{ x: number; z: number }>; color: string }>;
        waterBoundary: Array<{ x: number; z: number }>;
      };
    } catch {
      return {
        width: 2000,
        height: 2000,
        roads: [],
        districts: [],
        landmarks: [],
        waterBoundary: [
          { x: 800, z: -1000 },
          { x: 1000, z: -1000 },
          { x: 1000, z: 1000 },
          { x: 800, z: 1000 },
        ],
      };
    }
  }
}
