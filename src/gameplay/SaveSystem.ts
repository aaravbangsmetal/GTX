import type { EventBus } from '../shared/events';
import type { GameContext } from '../shared/types';
import type { Economy } from './Economy';
import type { GameplayPlayerBridge } from './player-bridge';
import type { MissionManager } from './MissionManager';
import type { SaveData } from './types';
import type { WantedSystem } from './WantedSystem';
import type { WeaponManager } from './WeaponManager';

export class SaveSystem {
  private static SAVE_KEY = 'gtx-save';
  private static SAVE_VERSION = 1;

  save(
    ctx: GameContext,
    player: GameplayPlayerBridge,
    economy: Economy,
    missions: MissionManager,
    wanted: WantedSystem,
    weapons: WeaponManager,
    slot = 0,
  ): void {
    const snapshot = player.getSnapshot();
    const data: SaveData = {
      version: SaveSystem.SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        position: snapshot.position,
        health: snapshot.health,
        armor: snapshot.armor,
        money: economy.getMoney(),
        weaponId: weapons.getCurrentWeaponId(),
        ammo: weapons.getAllAmmo(),
      },
      missions: {
        completed: missions.getCompletedMissions(),
        active: missions.getActiveMission()?.id ?? null,
        objectiveProgress: missions.getObjectiveProgress(),
      },
      wanted: {
        level: wanted.getLevel(),
      },
      settings: {},
    };

    localStorage.setItem(SaveSystem.SAVE_KEY, JSON.stringify(data));
    ctx.events.emit('save:complete', { slot });
  }

  load(
    ctx: GameContext,
    player: GameplayPlayerBridge,
    economy: Economy,
    missions: MissionManager,
    wanted: WantedSystem,
    weapons: WeaponManager,
    slot = 0,
  ): boolean {
    const raw = localStorage.getItem(SaveSystem.SAVE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== SaveSystem.SAVE_VERSION) return false;

      player.teleport(data.player.position);
      player.setHealth(data.player.health);
      player.setArmor(data.player.armor);
      economy.setMoney(data.player.money);
      player.addMoney(0);
      weapons.restoreAmmo(data.player.ammo, data.player.weaponId);
      player.setWeapon(data.player.weaponId);
      wanted.setLevel(data.wanted.level);
      missions.restoreProgress(
        data.missions.completed,
        data.missions.active,
        data.missions.objectiveProgress,
      );

      ctx.events.emit('save:loaded', { slot });
      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SaveSystem.SAVE_KEY) !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SaveSystem.SAVE_KEY);
  }
}

export type SaveEventBus = EventBus;
