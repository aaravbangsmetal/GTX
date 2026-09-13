/** Mirrors physics CollisionGroups — kept local to avoid cross-module imports. */
export enum CollisionGroup {
  STATIC = 1 << 0,
  PLAYER = 1 << 1,
  VEHICLE = 1 << 2,
  NPC = 1 << 3,
  PROJECTILE = 1 << 4,
  TRIGGER = 1 << 5,
}

export const PLAYER_COLLISION_MASK =
  CollisionGroup.STATIC |
  CollisionGroup.VEHICLE |
  CollisionGroup.NPC |
  CollisionGroup.TRIGGER;

export const STATIC_COLLISION_MASK =
  CollisionGroup.PLAYER |
  CollisionGroup.VEHICLE |
  CollisionGroup.NPC |
  CollisionGroup.PROJECTILE;
