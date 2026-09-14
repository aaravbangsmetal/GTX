import { distance3 } from '../shared/math';
import { PLAYER_SPAWN } from '../shared/constants';
import type { DistrictId, GameContext, System, Vec3 } from '../shared/types';
import type { IPhysicsService, IPlayerService, IRendererService, IWorldService } from '../shared/services';
import { NavGrid } from './NavGrid';
import { PedestrianPathfinder, RoadPathfinder } from './Pathfinder';
import { PoliceAI } from './PoliceAI';
import { ReactionSystem } from './ReactionSystem';
import { SpawnManager } from './SpawnManager';
import { TrafficLightManager } from './TrafficLightManager';
import { TrafficManager } from './TrafficManager';
import { adaptRoadNetwork } from './road-network-adapter';
import type { IVehicleAIControl } from './types';

export class AISystem implements System {
  readonly name = 'ai' as const;

  private ctx: GameContext | null = null;
  private spawnManager!: SpawnManager;
  private trafficManager!: TrafficManager;
  private policeAI!: PoliceAI;
  private reactionSystem!: ReactionSystem;
  private roadPathfinder!: RoadPathfinder;
  private pedPathfinder!: PedestrianPathfinder;
  private playerPos: Vec3 = { ...PLAYER_SPAWN };

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;

    const world = ctx.getSystem('world') as unknown as IWorldService;
    const physics = ctx.getSystem('physics') as unknown as IPhysicsService;
    const renderer = ctx.getSystem('renderer') as unknown as IRendererService;
    const vehicleControl = ctx.getSystem('vehicles') as unknown as IVehicleAIControl;

    const roadData = adaptRoadNetwork(world.getRoadNetwork());
    this.roadPathfinder = new RoadPathfinder(roadData);

    const navGrid = new NavGrid();
    navGrid.buildFromSidewalks(roadData.segments);
    this.pedPathfinder = new PedestrianPathfinder(navGrid);

    const trafficLights = new TrafficLightManager();
    trafficLights.registerIntersections(roadData.intersections);

    this.spawnManager = new SpawnManager(this.pedPathfinder, physics, renderer, ctx.events);
    this.trafficManager = new TrafficManager(
      vehicleControl,
      this.roadPathfinder,
      trafficLights,
      physics,
      roadData.intersections,
    );
    this.policeAI = new PoliceAI(vehicleControl, this.roadPathfinder);
    this.reactionSystem = new ReactionSystem(
      this.spawnManager,
      this.pedPathfinder,
      this.policeAI,
      ctx.events,
    );
    this.reactionSystem.init(() => this.playerPos);

    ctx.events.on('player:move', (payload) => {
      this.playerPos = payload.position;
    });

    ctx.events.once('player:spawn', (payload) => {
      this.playerPos = payload.position;
    });
  }

  fixedUpdate(dt: number): void {
    if (!this.ctx) return;

    const district = this.getDistrict();
    const wantedLevel = this.getWantedLevel();

    this.spawnManager.update(
      this.playerPos,
      district,
      dt,
      (pos) => distance3(pos, this.playerPos),
      wantedLevel,
    );
    this.trafficManager.update(this.playerPos, dt);
    this.policeAI.update(this.playerPos, dt);
  }

  update(_dt: number): void {
    // Visual sync handled by physics BodyMeshSync
  }

  dispose(): void {
    this.reactionSystem?.dispose();
    this.trafficManager?.despawnAll();
    this.policeAI?.despawnAll();
    for (const npc of this.spawnManager?.getActiveNPCs().values() ?? []) {
      npc.dispose();
    }
  }

  private getDistrict(): DistrictId {
    const world = this.ctx!.getSystem('world') as unknown as IWorldService;
    return world.getDistrictAt(this.playerPos) as DistrictId;
  }

  private getWantedLevel(): number {
    const player = this.ctx!.getSystem('player') as unknown as IPlayerService;
    return player.getState().wantedLevel;
  }
}
