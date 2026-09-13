import * as THREE from 'three';
import type { EventBus } from '../shared/events';
import { distance3 } from '../shared/math';
import type { EntityId, GameContext, Vec3 } from '../shared/types';
import type { IRendererService } from '../shared/services';
import type { Economy } from './Economy';
import { createMissionContext, MissionObjectiveChecker } from './MissionTypes';
import { MISSION_01 } from './missions/mission-01-welcome';
import { MISSION_02 } from './missions/mission-02-neighborhood';
import { MISSION_03 } from './missions/mission-03-delivery';
import { getNpcType } from './player-bridge';
import type { MissionContext, MissionDefinition, MissionObjective } from './types';

const MARKER_COLORS: Record<string, number> = {
  reach: 0xffcc00,
  kill: 0xff3333,
  deliver: 0x33ff66,
  collect: 0x33ccff,
};

export class MissionManager {
  private missions = new Map<string, MissionDefinition>();
  private activeMission: MissionDefinition | null = null;
  private completedMissions = new Set<string>();
  private missionContext: MissionContext = createMissionContext();
  private objectiveChecker = new MissionObjectiveChecker();
  private markers = new Map<string, THREE.Object3D>();
  private markerTime = 0;
  private renderer: IRendererService | null = null;
  private ctx: GameContext | null = null;
  private npcTypes = new Map<EntityId, string>();
  private objectiveProgress: Record<string, boolean> = {};

  constructor(
    private events: EventBus,
    private economy: Economy,
  ) {}

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.renderer = this.resolveRenderer(ctx);
    this.registerMission(MISSION_01);
    this.registerMission(MISSION_02);
    this.registerMission(MISSION_03);

    this.events.on('ai:npcSpawn', ({ npcId, type }) => {
      this.npcTypes.set(npcId, type);
    });

    this.events.on('ai:npcDeath', ({ npcId }) => {
      const npcType = this.npcTypes.get(npcId) ?? 'pedestrian';
      this.npcTypes.delete(npcId);
      if (!this.activeMission) return;
      const key = npcType.includes('hostile') ? 'hostile' : npcType;
      this.missionContext.kills[key] = (this.missionContext.kills[key] ?? 0) + 1;
    });

    this.events.on('player:death', () => {
      if (this.activeMission) {
        this.failMission('You died');
      }
    });
  }

  registerMission(mission: MissionDefinition): void {
    this.missions.set(mission.id, mission);
  }

  startMission(missionId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission || this.activeMission) return false;

    for (const prereq of mission.prerequisites) {
      if (!this.completedMissions.has(prereq)) return false;
    }

    this.activeMission = {
      ...mission,
      objectives: mission.objectives.map((obj) => ({ ...obj, completed: false })),
    };
    this.missionContext = createMissionContext();
    this.objectiveProgress = {};

    const firstObjective = this.getCurrentObjectiveText();
    this.events.emit('mission:start', {
      missionId: mission.id,
      title: mission.title,
      objective: firstObjective,
    });

    mission.onStart?.(this.createMissionCtx());
    this.spawnMarkers(mission);
    return true;
  }

  update(dt: number, playerPos: Vec3, playerState: {
    isInVehicle: boolean;
    vehicleId: EntityId | null;
    isDead: boolean;
  }): void {
    this.markerTime += dt;
    this.animateMarkers();

    if (!this.activeMission) return;

    this.missionContext.playerPos = { ...playerPos };
    this.missionContext.isInVehicle = playerState.isInVehicle;
    this.missionContext.playerVehicle = playerState.vehicleId;
    this.missionContext.playerDead = playerState.isDead;
    this.missionContext.elapsed = performance.now() / 1000 - this.missionContext.missionStartTime;

    let completedCount = 0;
    for (const objective of this.activeMission.objectives) {
      const wasComplete = objective.completed;
      objective.completed = this.objectiveChecker.check(objective, this.missionContext);
      this.objectiveProgress[objective.id] = objective.completed;

      if (objective.id === 'pickup-package' && objective.completed && !wasComplete) {
        this.missionContext.carryingPackage = true;
      }

      if (objective.completed) completedCount++;
    }

    const progress = completedCount / this.activeMission.objectives.length;
    this.events.emit('mission:update', {
      missionId: this.activeMission.id,
      progress,
      objective: this.getCurrentObjectiveText(),
    });

    const deliveryObjective = this.activeMission.objectives.find((obj) => obj.id === 'deliver-package');
    if (deliveryObjective?.timeLimit && this.missionContext.elapsed > deliveryObjective.timeLimit) {
      if (!this.activeMission.objectives.every((obj) => obj.completed)) {
        this.failMission('Time expired');
        return;
      }
    }

    if (this.activeMission.objectives.every((obj) => obj.completed)) {
      this.completeMission();
    }
  }

  completeMission(): void {
    if (!this.activeMission) return;
    const mission = this.activeMission;

    this.economy.add(mission.reward);
    this.completedMissions.add(mission.id);

    this.events.emit('mission:complete', {
      missionId: mission.id,
      reward: mission.reward,
    });

    this.events.emit('ui:notification', {
      text: 'MISSION PASSED!',
      type: 'success',
      duration: 4,
    });

    mission.onComplete?.(this.createMissionCtx());
    this.clearActiveMission();
  }

  failMission(reason: string): void {
    if (!this.activeMission) return;
    const missionId = this.activeMission.id;

    this.events.emit('mission:fail', { missionId, reason });
    this.events.emit('ui:notification', {
      text: 'MISSION FAILED!',
      type: 'error',
      duration: 4,
    });

    this.activeMission.onFail?.(this.createMissionCtx());
    this.clearActiveMission();
  }

  isCompleted(missionId: string): boolean {
    return this.completedMissions.has(missionId);
  }

  getActiveMission(): MissionDefinition | null {
    return this.activeMission;
  }

  getCompletedMissions(): string[] {
    return [...this.completedMissions];
  }

  getObjectiveProgress(): Record<string, boolean> {
    return { ...this.objectiveProgress };
  }

  restoreProgress(completed: string[], active: string | null, progress: Record<string, boolean>): void {
    this.completedMissions = new Set(completed);
    this.objectiveProgress = { ...progress };
    if (active) {
      this.startMission(active);
      if (this.activeMission) {
        for (const objective of this.activeMission.objectives) {
          objective.completed = progress[objective.id] ?? false;
        }
      }
    }
  }

  dispose(): void {
    this.clearMarkers();
  }

  private clearActiveMission(): void {
    this.activeMission = null;
    this.clearMarkers();
  }

  private getCurrentObjectiveText(): string {
    if (!this.activeMission) return '';
    const next = this.activeMission.objectives.find((obj) => !obj.completed);
    return next?.description ?? 'Complete';
  }

  private createMissionCtx(): GameContext {
    if (this.ctx) return this.ctx;
    throw new Error('MissionManager not initialized');
  }

  private spawnMarkers(mission: MissionDefinition): void {
    if (!this.renderer) return;
    this.clearMarkers();

    for (const objective of mission.objectives) {
      if (!objective.position) continue;
      const color = MARKER_COLORS[objective.type] ?? MARKER_COLORS.reach;
      const marker = createMissionMarker(objective.position, color);
      this.renderer.addToScene(marker);
      this.markers.set(objective.id, marker);
    }
  }

  private animateMarkers(): void {
    for (const marker of this.markers.values()) {
      marker.rotation.y += 0.02;
      marker.position.y += Math.sin(this.markerTime * 2) * 0.002;
    }
  }

  private clearMarkers(): void {
    if (!this.renderer) {
      this.markers.clear();
      return;
    }
    for (const marker of this.markers.values()) {
      this.renderer.removeFromScene(marker);
    }
    this.markers.clear();
  }

  private resolveRenderer(ctx: GameContext): IRendererService | null {
    const sys = ctx.getSystem('renderer') as unknown as Partial<IRendererService>;
    if (typeof sys.addToScene === 'function') {
      return sys as IRendererService;
    }
    return null;
  }
}

function createMissionMarker(position: Vec3, color: number): THREE.Object3D {
  const geometry = new THREE.ConeGeometry(1.5, 4, 8);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const cone = new THREE.Mesh(geometry, material);
  cone.position.set(position.x, position.y + 3, position.z);
  return cone;
}

export function isNearMissionGiver(playerPos: Vec3, giverPos: Vec3, radius = 5): boolean {
  return distance3(playerPos, giverPos) <= radius;
}

export function cloneObjective(objective: MissionObjective): MissionObjective {
  return { ...objective, completed: false };
}

export { getNpcType };
