export enum CollisionGroup {
  STATIC = 1 << 0,
  PLAYER = 1 << 1,
  VEHICLE = 1 << 2,
  NPC = 1 << 3,
  PROJECTILE = 1 << 4,
  TRIGGER = 1 << 5,
}

export const COLLISION_MASKS: Record<string, number> = {
  STATIC:
    CollisionGroup.PLAYER |
    CollisionGroup.VEHICLE |
    CollisionGroup.NPC |
    CollisionGroup.PROJECTILE,
  PLAYER:
    CollisionGroup.STATIC |
    CollisionGroup.VEHICLE |
    CollisionGroup.NPC |
    CollisionGroup.TRIGGER,
  VEHICLE:
    CollisionGroup.STATIC |
    CollisionGroup.PLAYER |
    CollisionGroup.VEHICLE |
    CollisionGroup.NPC,
  NPC:
    CollisionGroup.STATIC |
    CollisionGroup.PLAYER |
    CollisionGroup.VEHICLE |
    CollisionGroup.PROJECTILE,
  PROJECTILE:
    CollisionGroup.STATIC | CollisionGroup.NPC | CollisionGroup.PLAYER,
  TRIGGER: CollisionGroup.PLAYER,
};
