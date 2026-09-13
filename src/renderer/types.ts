import type { Color } from 'three';

export enum RenderLayer {
  WORLD = 0,
  VEHICLE = 1,
  CHARACTER = 2,
  EFFECT = 3,
  UI_3D = 4,
}

export interface DayNightSkyColors {
  top: string;
  bottom: string;
  horizon: string;
}

export interface RendererDayNightState {
  hour: number;
  sunAngle: number;
  sunColor: Color;
  ambientIntensity: number;
  isNight: boolean;
  bloomStrength: number;
  skyColors: DayNightSkyColors;
}

export interface RendererConfig {
  antialias: boolean;
  shadowMapSize: number;
  pixelRatioMax: number;
  postProcessing: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}

export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  antialias: false,
  shadowMapSize: 1024,
  pixelRatioMax: 2,
  postProcessing: true,
  quality: 'high',
};
