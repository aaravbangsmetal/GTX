import * as THREE from 'three';
import { DAY_LENGTH_MINUTES } from '../shared/constants';
import { lerp } from '../shared/math';
import type { EventBus } from '../shared/events';
import type { RendererDayNightState } from './types';

interface TimePreset {
  hour: number;
  sky: { top: string; bottom: string; horizon: string };
  sunColor: string;
  ambient: number;
  bloom: number;
  isNight: boolean;
}

const PRESETS: TimePreset[] = [
  {
    hour: 6,
    sky: { top: '#6B8CBF', bottom: '#FFB6C1', horizon: '#FF8C42' },
    sunColor: '#FFD700',
    ambient: 0.4,
    bloom: 0.1,
    isNight: false,
  },
  {
    hour: 12,
    sky: { top: '#4A90D9', bottom: '#87CEEB', horizon: '#B0D4F1' },
    sunColor: '#FFFFFF',
    ambient: 0.8,
    bloom: 0.0,
    isNight: false,
  },
  {
    hour: 18,
    sky: { top: '#7B4FBF', bottom: '#FF6B9D', horizon: '#FF8C42' },
    sunColor: '#FF6B35',
    ambient: 0.5,
    bloom: 0.3,
    isNight: false,
  },
  {
    hour: 22,
    sky: { top: '#1A1A4E', bottom: '#4A00E0', horizon: '#7B4FBF' },
    sunColor: '#4A00E0',
    ambient: 0.15,
    bloom: 0.5,
    isNight: true,
  },
  {
    hour: 2,
    sky: { top: '#0A0A1A', bottom: '#1A1A2E', horizon: '#2D1B4E' },
    sunColor: '#1A1A2E',
    ambient: 0.1,
    bloom: 0.6,
    isNight: true,
  },
];

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  ca.lerp(cb, t);
  return `#${ca.getHexString()}`;
}

function getPresetPair(hour: number): { from: TimePreset; to: TimePreset; t: number } {
  const h = ((hour % 24) + 24) % 24;
  const sorted = [...PRESETS].sort((a, b) => a.hour - b.hour);

  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i];
    const to = sorted[(i + 1) % sorted.length];
    const fromH = from.hour;
    const toH = to.hour > fromH ? to.hour : to.hour + 24;

    if (h >= fromH && h < toH) {
      const t = (h - fromH) / (toH - fromH);
      return { from, to, t };
    }
  }

  return { from: sorted[0], to: sorted[1], t: 0 };
}

export class DayNightCycle {
  private hour = 18;
  private speed = 1;
  private lastEmittedHour = 18;
  private sunColor = new THREE.Color();
  private events: EventBus | null = null;

  constructor(events?: EventBus) {
    this.events = events ?? null;
  }

  setEvents(events: EventBus): void {
    this.events = events;
  }

  update(dt: number): void {
    const hoursPerSecond = 24 / (DAY_LENGTH_MINUTES * 60);
    this.hour = (this.hour + dt * hoursPerSecond * this.speed) % 24;

    const currentHour = Math.floor(this.hour);
    if (currentHour !== this.lastEmittedHour) {
      this.lastEmittedHour = currentHour;
      const state = this.getState();
      this.events?.emit('world:timeChange', {
        hour: currentHour,
        isNight: state.isNight,
        sunAngle: state.sunAngle,
      });
    }
  }

  getState(): RendererDayNightState {
    const { from, to, t } = getPresetPair(this.hour);

    const skyColors = {
      top: lerpColor(from.sky.top, to.sky.top, t),
      bottom: lerpColor(from.sky.bottom, to.sky.bottom, t),
      horizon: lerpColor(from.sky.horizon, to.sky.horizon, t),
    };

    this.sunColor.set(lerpColor(from.sunColor, to.sunColor, t));

    const sunAngle = ((this.hour - 6) / 24) * Math.PI * 2;

    return {
      hour: this.hour,
      sunAngle,
      sunColor: this.sunColor,
      ambientIntensity: lerp(from.ambient, to.ambient, t),
      isNight: t < 0.5 ? from.isNight : to.isNight,
      bloomStrength: lerp(from.bloom, to.bloom, t),
      skyColors,
    };
  }

  setHour(hour: number): void {
    this.hour = hour % 24;
    this.lastEmittedHour = Math.floor(this.hour);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }
}
