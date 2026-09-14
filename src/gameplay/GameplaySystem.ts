import { normalize3, vec3 } from '../shared/math';
import type { GameContext, System, Vec3 } from '../shared/types';
import { CombatSystem } from './CombatSystem';
import { CrimeDetector } from './CrimeDetector';
import { Economy } from './Economy';
import { MissionManager } from './MissionManager';
import { PickupSystem } from './PickupSystem';
import { SaveSystem } from './SaveSystem';
import { WantedSystem } from './WantedSystem';
import { WeaponManager } from './WeaponManager';
import { createGameplayPlayerBridge } from './player-bridge';
import { resolvePhysics, resolvePlayer } from './service-resolver';

export class GameplaySystem implements System {
  readonly name = 'gameplay' as const;

  private ctx!: GameContext;
  private wanted!: WantedSystem;
  private combat!: CombatSystem;
  private weapons!: WeaponManager;
  private missions!: MissionManager;
  private pickups!: PickupSystem;
  private economy!: Economy;
  private save!: SaveSystem;
  private crime!: CrimeDetector;
  private playerBridge!: ReturnType<typeof createGameplayPlayerBridge>;
  private missionStartTimer: ReturnType<typeof setTimeout> | null = null;
  private isFiring = false;
  private aimYaw = 0;
  private boundHandlers: Array<() => void> = [];

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.wanted = new WantedSystem(ctx.events);
    this.weapons = new WeaponManager(ctx.events);
    this.economy = new Economy();
    this.combat = new CombatSystem(this.weapons, resolvePhysics(ctx), ctx.events);
    this.missions = new MissionManager(ctx.events, this.economy);
    this.pickups = new PickupSystem();
    this.save = new SaveSystem();
    this.crime = new CrimeDetector(this.wanted, ctx.events);

    const player = resolvePlayer(ctx);
    this.playerBridge = createGameplayPlayerBridge(player);
    this.combat.setPlayerBridge(this.playerBridge);

    this.combat.init();
    this.crime.init();
    this.missions.init(ctx);
    this.pickups.init(ctx);
    this.pickups.bind(this.playerBridge, this.weapons, this.economy);

    this.bindCombatInput();
    this.bindSaveHandlers();

    this.missionStartTimer = setTimeout(() => {
      this.missions.startMission('mission-01-welcome');
    }, 3000);
  }

  fixedUpdate(dt: number): void {
    this.combat.update(dt);
    this.handleAutomaticFire();
  }

  update(dt: number): void {
    const pos = this.playerBridge.getPosition();
    const snapshot = this.playerBridge.getSnapshot();

    this.wanted.update(dt, pos, snapshot.wantedLevel > 0 && !this.wanted.isPlayerHidden());
    this.playerBridge.setWantedLevel(this.wanted.getLevel());

    this.missions.update(dt, pos, {
      isInVehicle: snapshot.isInVehicle,
      vehicleId: snapshot.vehicleId,
      isDead: snapshot.health <= 0,
    });

    this.pickups.update(dt, pos);
    this.syncPlayerEconomy();
  }

  dispose(): void {
    if (this.missionStartTimer) clearTimeout(this.missionStartTimer);
    for (const unbind of this.boundHandlers) unbind();
    this.boundHandlers = [];
    this.combat.dispose();
    this.crime.dispose();
    this.missions.dispose();
    this.pickups.dispose();
  }

  private syncPlayerEconomy(): void {
    const money = this.economy.getMoney();
    const snapshot = this.playerBridge.getSnapshot();
    if (snapshot.money !== money) {
      this.playerBridge.addMoney(money - snapshot.money);
    }
    this.ctx.events.emit('player:stateChange', {
      state: {
        ...snapshot,
        money,
        wantedLevel: this.wanted.getLevel(),
        weaponId: this.weapons.getCurrentWeaponId(),
      },
    });
  }

  private bindCombatInput(): void {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.isFiring = true;
      this.tryFire();
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.isFiring = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && this.playerBridge.isControllable()) {
        this.weapons.reload();
      }
      if (e.code === 'Digit1') this.weapons.switchWeapon('fists');
      if (e.code === 'Digit2') this.weapons.switchWeapon('pistol');
      if (e.code === 'Digit3') this.weapons.switchWeapon('smg');
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === this.ctx.canvas) {
        this.aimYaw -= e.movementX * 0.002;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove);

    this.boundHandlers.push(() => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouseMove);
    });
  }

  private bindSaveHandlers(): void {
    const pauseHandler = () => {
      if (this.save.hasSave()) return;
      this.save.save(
        this.ctx,
        this.playerBridge,
        this.economy,
        this.missions,
        this.wanted,
        this.weapons,
      );
    };
    this.ctx.events.on('game:pause', pauseHandler);
    this.boundHandlers.push(() => this.ctx.events.off('game:pause', pauseHandler));
  }

  private handleAutomaticFire(): void {
    if (!this.isFiring) return;
    const weapon = this.weapons.getCurrentWeapon();
    if (weapon.isAutomatic) {
      this.tryFire();
    }
  }

  private tryFire(): void {
    const origin = this.getFireOrigin();
    const direction = this.getFireDirection();
    this.weapons.fire(origin, direction);
  }

  private getFireOrigin(): Vec3 {
    const pos = this.playerBridge.getPosition();
    return { x: pos.x, y: pos.y + 1.4, z: pos.z };
  }

  private getFireDirection(): Vec3 {
    return normalize3({
      x: Math.sin(this.aimYaw),
      y: 0,
      z: Math.cos(this.aimYaw),
    });
  }
}

export function getGameplayFireOrigin(position: Vec3): Vec3 {
  return vec3(position.x, position.y + 1.4, position.z);
}
