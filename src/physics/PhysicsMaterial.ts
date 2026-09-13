import * as CANNON from 'cannon-es';

export interface MaterialPreset {
  friction: number;
  restitution: number;
}

export const PHYSICS_MATERIALS: Record<string, MaterialPreset> = {
  default: { friction: 0.5, restitution: 0.1 },
  'tire-road': { friction: 1.2, restitution: 0.05 },
  'tire-grass': { friction: 0.6, restitution: 0.1 },
  'foot-ground': { friction: 0.8, restitution: 0.0 },
  'foot-sidewalk': { friction: 0.9, restitution: 0.0 },
  'vehicle-body': { friction: 0.4, restitution: 0.3 },
  metal: { friction: 0.3, restitution: 0.5 },
  ice: { friction: 0.05, restitution: 0.1 },
};

const materialCache = new Map<string, CANNON.Material>();

export function getPhysicsMaterial(name = 'default'): CANNON.Material {
  const cached = materialCache.get(name);
  if (cached) return cached;

  const preset = PHYSICS_MATERIALS[name] ?? PHYSICS_MATERIALS.default;
  const material = new CANNON.Material(name);
  material.friction = preset.friction;
  material.restitution = preset.restitution;
  materialCache.set(name, material);
  return material;
}
