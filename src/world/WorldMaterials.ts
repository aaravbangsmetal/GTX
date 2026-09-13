import {
  Color,
  DoubleSide,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { IRendererService } from '../shared/services';
import { ROAD_COLORS } from './palette';

export class WorldMaterials {
  private cache = new Map<string, Material>();
  private renderer: IRendererService | null;

  constructor(renderer: IRendererService | null) {
    this.renderer = renderer;
  }

  get(id: string, fallbackColor: string, emissive = false): Material {
    const cached = this.cache.get(id);
    if (cached) return cached;

    try {
      if (this.renderer) {
        const mat = this.renderer.getMaterial(id);
        this.cache.set(id, mat);
        return mat;
      }
    } catch {
      // fall through to local material
    }

    const mat = new MeshStandardMaterial({
      color: new Color(fallbackColor),
      emissive: emissive ? new Color(fallbackColor) : new Color(0x000000),
      emissiveIntensity: emissive ? 0.8 : 0,
      side: DoubleSide,
      roughness: 0.85,
      metalness: emissive ? 0.2 : 0.05,
    });
    this.cache.set(id, mat);
    return mat;
  }

  asphalt(): Material {
    return this.get('road_asphalt', ROAD_COLORS.asphalt);
  }

  sidewalk(): Material {
    return this.get('road_sidewalk', ROAD_COLORS.sidewalk);
  }

  markingWhite(): Material {
    return this.get('road_marking_white', ROAD_COLORS.markingWhite);
  }

  markingYellow(): Material {
    return this.get('road_marking_yellow', ROAD_COLORS.markingYellow);
  }

  sand(): Material {
    return this.get('terrain_sand', ROAD_COLORS.sand);
  }

  water(): Material {
    return this.get('terrain_water', ROAD_COLORS.water);
  }

  building(color: string): Material {
    return this.get(`building_${color}`, color);
  }

  neon(color: string): Material {
    return this.get(`neon_${color}`, color, true);
  }

  dispose(): void {
    for (const mat of this.cache.values()) {
      if (mat instanceof MeshStandardMaterial) {
        mat.dispose();
      }
    }
    this.cache.clear();
  }
}
