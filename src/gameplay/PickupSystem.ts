import * as THREE from 'three';
import { distance3 } from '../shared/math';
import type { EventBus } from '../shared/events';
import type { GameContext, Vec3 } from '../shared/types';
import type { IRendererService } from '../shared/services';
import type { Economy } from './Economy';
import type { GameplayPlayerBridge } from './player-bridge';
import type { PickupConfig } from './types';
import type { WeaponManager } from './WeaponManager';

export const WORLD_PICKUPS: PickupConfig[] = [
  { type: 'health', value: 25, position: { x: 150, y: 1, z: -50 }, respawnTime: 60 },
  { type: 'health', value: 25, position: { x: -100, y: 1, z: 0 }, respawnTime: 60 },
  { type: 'health', value: 25, position: { x: 50, y: 1, z: -200 }, respawnTime: 60 },
  { type: 'armor', value: 25, position: { x: -50, y: 1, z: 100 }, respawnTime: 90 },
  { type: 'armor', value: 25, position: { x: -200, y: 1, z: 150 }, respawnTime: 90 },
  { type: 'weapon', value: 'pistol', position: { x: -400, y: 1, z: 50 }, respawnTime: 0 },
  { type: 'weapon', value: 'smg', position: { x: -350, y: 1, z: 80 }, respawnTime: 120 },
  { type: 'money', value: 100, position: { x: 200, y: 1, z: -200 }, respawnTime: 120 },
  { type: 'money', value: 250, position: { x: -150, y: 1, z: -300 }, respawnTime: 180 },
  { type: 'money', value: 50, position: { x: 300, y: 1, z: 100 }, respawnTime: 90 },
  { type: 'ammo', value: 24, position: { x: -100, y: 1, z: -400 }, respawnTime: 60 },
  { type: 'ammo', value: 30, position: { x: 80, y: 1, z: 500 }, respawnTime: 60 },
];

interface PickupInstance {
  config: PickupConfig;
  id: string;
  active: boolean;
  respawnTimer: number;
}

const PICKUP_COLORS: Record<PickupConfig['type'], number> = {
  health: 0xff4444,
  armor: 0x4488ff,
  weapon: 0x888888,
  money: 0x44ff44,
  ammo: 0xffcc00,
};

const COLLECT_RADIUS = 2;

export class PickupSystem {
  private activePickups = new Map<string, PickupInstance>();
  private meshes = new Map<string, THREE.Object3D>();
  private renderer: IRendererService | null = null;
  private animTime = 0;
  private playerBridge: GameplayPlayerBridge | null = null;
  private weapons: WeaponManager | null = null;
  private economy: Economy | null = null;
  private events: EventBus | null = null;

  init(ctx: GameContext): void {
    this.events = ctx.events;
    this.renderer = this.resolveRenderer(ctx);

    WORLD_PICKUPS.forEach((config, index) => {
      const id = `pickup-${index}`;
      this.activePickups.set(id, {
        config,
        id,
        active: true,
        respawnTimer: 0,
      });
      this.spawnMesh(id, config);
    });
  }

  bind(
    playerBridge: GameplayPlayerBridge,
    weapons: WeaponManager,
    economy: Economy,
  ): void {
    this.playerBridge = playerBridge;
    this.weapons = weapons;
    this.economy = economy;
  }

  update(dt: number, playerPos: Vec3): void {
    this.animTime += dt;
    this.animateMeshes();

    if (!this.playerBridge || !this.weapons || !this.economy || !this.events) return;

    for (const pickup of this.activePickups.values()) {
      if (!pickup.active) {
        pickup.respawnTimer -= dt;
        if (pickup.respawnTimer <= 0 && pickup.config.respawnTime > 0) {
          pickup.active = true;
          this.spawnMesh(pickup.id, pickup.config);
        }
        continue;
      }

      if (distance3(playerPos, pickup.config.position) <= COLLECT_RADIUS) {
        this.collectPickup(pickup);
      }
    }
  }

  dispose(): void {
    if (this.renderer) {
      for (const mesh of this.meshes.values()) {
        this.renderer.removeFromScene(mesh);
      }
    }
    this.meshes.clear();
    this.activePickups.clear();
  }

  private collectPickup(pickup: PickupInstance): void {
    if (!this.playerBridge || !this.weapons || !this.economy || !this.events) return;

    const { config } = pickup;
    const snapshot = this.playerBridge.getSnapshot();

    switch (config.type) {
      case 'health':
        this.playerBridge.setHealth(snapshot.health + Number(config.value));
        break;
      case 'armor':
        this.playerBridge.setArmor(snapshot.armor + Number(config.value));
        break;
      case 'weapon':
        this.weapons.giveWeapon(String(config.value), config.value === 'pistol' ? 12 : 30);
        this.playerBridge.setWeapon(String(config.value));
        break;
      case 'money':
        this.economy.add(Number(config.value));
        this.playerBridge.addMoney(Number(config.value));
        break;
      case 'ammo':
        this.weapons.addAmmo('pistol', Number(config.value));
        break;
    }

    this.events.emit('pickup:collected', {
      type: config.type,
      value: typeof config.value === 'number' ? config.value : 0,
    });

    pickup.active = false;
    pickup.respawnTimer = config.respawnTime;
    this.removeMesh(pickup.id);
  }

  private spawnMesh(id: string, config: PickupConfig): void {
    if (!this.renderer) return;
    this.removeMesh(id);

    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshBasicMaterial({
      color: PICKUP_COLORS[config.type],
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(config.position.x, config.position.y + 0.8, config.position.z);
    this.renderer.addToScene(mesh);
    this.meshes.set(id, mesh);
  }

  private removeMesh(id: string): void {
    const mesh = this.meshes.get(id);
    if (!mesh || !this.renderer) return;
    this.renderer.removeFromScene(mesh);
    this.meshes.delete(id);
  }

  private animateMeshes(): void {
    for (const mesh of this.meshes.values()) {
      mesh.rotation.y += 0.03;
      mesh.position.y += Math.sin(this.animTime * 3 + mesh.position.x) * 0.001;
    }
  }

  private resolveRenderer(ctx: GameContext): IRendererService | null {
    const sys = ctx.getSystem('renderer') as unknown as Partial<IRendererService>;
    if (typeof sys.addToScene === 'function') {
      return sys as IRendererService;
    }
    return null;
  }
}
