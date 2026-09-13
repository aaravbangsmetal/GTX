export interface HUDState {
  health: number;
  armor: number;
  money: number;
  weaponId: string | null;
  weaponAmmo: number;
  wantedLevel: number;
  isInVehicle: boolean;
  vehicleSpeed: number;
  radioStation: string | null;
  missionObjective: string | null;
  interactionPrompt: string | null;
}

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  createdAt: number;
}

export interface UISettings {
  showMinimap: boolean;
  showHUD: boolean;
  hudScale: number;
}

export interface GTXSettings extends UISettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  mouseSensitivity: number;
  graphicsQuality: 'low' | 'medium' | 'high';
}

export interface RadioStationInfo {
  id: string;
  name: string;
  tagline: string;
  color: string;
}

export interface MinimapBlip {
  pos: { x: number; z: number };
  color: string;
  size: number;
  type: 'mission' | 'vehicle' | 'police' | 'pickup';
}

export const DEFAULT_GTX_SETTINGS: GTXSettings = {
  showMinimap: true,
  showHUD: true,
  hudScale: 1,
  masterVolume: 100,
  musicVolume: 60,
  sfxVolume: 100,
  ambientVolume: 50,
  mouseSensitivity: 1,
  graphicsQuality: 'medium',
};

export const SETTINGS_STORAGE_KEY = 'gtx-settings';
