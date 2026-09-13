import type { Vec3 } from '../shared/types';
import { BLIP_COLORS, ROAD_COLORS, VICE_CITY_THEME } from './UITheme';
import type { MinimapBlip } from './types';

interface MinimapRoad {
  points: Array<{ x: number; z: number }>;
  width: number;
  type: string;
}

interface MinimapDistrict {
  polygon: Array<{ x: number; z: number }>;
  color: string;
}

interface MinimapDataShape {
  width: number;
  height: number;
  roads: MinimapRoad[];
  districts: MinimapDistrict[];
  waterBoundary: Array<{ x: number; z: number }>;
}

export class Minimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly size = VICE_CITY_THEME.sizes.minimap;
  private readonly zoom = 0.15;
  private visible = true;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'minimap-container';

    const north = document.createElement('div');
    north.className = 'minimap-north';
    north.textContent = 'N';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap-canvas';
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Minimap failed to acquire 2D context');
    }
    this.ctx = ctx;

    this.container.appendChild(north);
    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);

    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Tab') {
        event.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  render(
    playerPos: Vec3,
    playerHeading: number,
    minimapData: MinimapDataShape,
    blips: MinimapBlip[],
  ): void {
    const { ctx, size } = this;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 8);
    ctx.clip();

    this.drawWater(minimapData.waterBoundary, playerPos);
    this.drawDistricts(minimapData.districts, playerPos);
    this.drawRoads(minimapData.roads, playerPos);
    this.drawBlips(blips, playerPos);
    this.drawPlayer(playerHeading);

    ctx.restore();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.classList.toggle('hidden', !this.visible);
  }

  show(): void {
    this.visible = true;
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }

  private worldToScreen(worldX: number, worldZ: number, playerPos: Vec3): { x: number; y: number } {
    const dx = (worldX - playerPos.x) / this.zoom;
    const dz = (worldZ - playerPos.z) / this.zoom;
    return {
      x: this.size / 2 + dx,
      y: this.size / 2 + dz,
    };
  }

  private drawWater(boundary: Array<{ x: number; z: number }>, playerPos: Vec3): void {
    if (boundary.length < 3) return;

    this.ctx.fillStyle = 'rgba(26, 82, 118, 0.7)';
    this.ctx.beginPath();
    const first = this.worldToScreen(boundary[0].x, boundary[0].z, playerPos);
    this.ctx.moveTo(first.x, first.y);
    for (let i = 1; i < boundary.length; i += 1) {
      const p = this.worldToScreen(boundary[i].x, boundary[i].z, playerPos);
      this.ctx.lineTo(p.x, p.y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawDistricts(districts: MinimapDistrict[], playerPos: Vec3): void {
    for (const district of districts) {
      if (district.polygon.length < 3) continue;

      this.ctx.fillStyle = `${district.color}33`;
      this.ctx.beginPath();
      const first = this.worldToScreen(district.polygon[0].x, district.polygon[0].z, playerPos);
      this.ctx.moveTo(first.x, first.y);
      for (let i = 1; i < district.polygon.length; i += 1) {
        const p = this.worldToScreen(district.polygon[i].x, district.polygon[i].z, playerPos);
        this.ctx.lineTo(p.x, p.y);
      }
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawRoads(roads: MinimapRoad[], playerPos: Vec3): void {
    for (const road of roads) {
      if (road.points.length < 2) continue;

      this.ctx.strokeStyle = ROAD_COLORS[road.type] ?? '#AAAAAA';
      this.ctx.lineWidth = Math.max(1, road.width * 0.08);
      this.ctx.beginPath();

      const start = this.worldToScreen(road.points[0].x, road.points[0].z, playerPos);
      this.ctx.moveTo(start.x, start.y);
      for (let i = 1; i < road.points.length; i += 1) {
        const p = this.worldToScreen(road.points[i].x, road.points[i].z, playerPos);
        this.ctx.lineTo(p.x, p.y);
      }
      this.ctx.stroke();
    }
  }

  private drawBlips(blips: MinimapBlip[], playerPos: Vec3): void {
    for (const blip of blips) {
      const { x, y } = this.worldToScreen(blip.pos.x, blip.pos.z, playerPos);
      if (x < -10 || y < -10 || x > this.size + 10 || y > this.size + 10) continue;

      this.ctx.fillStyle = blip.color || BLIP_COLORS[blip.type] || '#FFFFFF';

      if (blip.type === 'mission') {
        this.ctx.fillRect(x - blip.size, y - blip.size, blip.size * 2, blip.size * 2);
      } else if (blip.type === 'pickup') {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - blip.size);
        this.ctx.lineTo(x + blip.size, y);
        this.ctx.lineTo(x, y + blip.size);
        this.ctx.lineTo(x - blip.size, y);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.arc(x, y, blip.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawPlayer(heading: number): void {
    const cx = this.size / 2;
    const cy = this.size / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(heading);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#2DD4BF';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -8);
    this.ctx.lineTo(6, 6);
    this.ctx.lineTo(0, 3);
    this.ctx.lineTo(-6, 6);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }
}
