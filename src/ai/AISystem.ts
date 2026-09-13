import { distance3 } from '../shared/math';
import { PLAYER_SPAWN } from '../shared/constants';
import type { DistrictId, GameContext, System, Vec3 } from '../shared/types';
import type { IPhysicsService, IPlayerService, IRendererService, IWorldService } from '../shared/services';
import { MockPhysicsService } from './__mocks__/MockPhysicsService';
import { MockRendererService } from './__mocks__/MockRendererService';
import { MockVehicleService } from './__mocks__/MockVehicleService';
import { MockWorldService } from './__mocks__/MockWorldService';
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

    const world = this.resolveWorld(ctx);
    const physics = this.resolvePhysics(ctx);
    const renderer = this.resolveRenderer(ctx);
    const vehicleControl = this.resolveVehicleControl(ctx);

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
    try {
      const world = this.ctx!.getSystem('world') as unknown as IWorldService;
      return world.getDistrictAt(this.playerPos) as DistrictId;
    } catch {
      return 1 as DistrictId;
    }
  }

  private getWantedLevel(): number {
    try {
      const player = this.ctx!.getSystem('player') as unknown as IPlayerService;
      return player.getState().wantedLevel;
    } catch {
      return 0;
    }
  }

  private resolveWorld(ctx: GameContext): IWorldService {
    try {
      const sys = ctx.getSystem('world');
      if ('getRoadNetwork' in sys) return sys as unknown as IWorldService;
    } catch { /* stub */ }
    return new MockWorldService();
  }

  private resolvePhysics(ctx: GameContext): IPhysicsService {
    try {
      const sys = ctx.getSystem('physics');
      if ('createBody' in sys) return sys as unknown as IPhysicsService;
    } catch { /* stub */ }
    return new MockPhysicsService();
  }

  private resolveRenderer(ctx: GameContext): IRendererService {
    try {
      const sys = ctx.getSystem('renderer');
      if ('addToScene' in sys) return sys as unknown as IRendererService;
    } catch { /* stub */ }
    return new MockRendererService();
  }

  private resolveVehicleControl(ctx: GameContext): IVehicleAIControl {
    try {
      const sys = ctx.getSystem('vehicles');
      if ('spawnVehicle' in sys && 'setAIInput' in sys) {
        return sys as unknown as IVehicleAIControl;
      }
      if ('spawnVehicle' in sys) {
        return new VehicleServiceAdapter(sys as unknown as import('../shared/services').IVehicleService);
      }
    } catch { /* stub */ }
    return new MockVehicleService();
  }
}

class VehicleServiceAdapter implements IVehicleAIControl {
  private vehicleService: import('../shared/services').IVehicleService;
  private inputs = new Map<number, import('./types').VehicleAIInput>();

  constructor(vehicleService: import('../shared/services').IVehicleService) {
    this.vehicleService = vehicleService;
  }

  getState(entityId: number) {
    const snap = this.vehicleService.getVehicle(entityId);
    if (!snap) return null;
    return {
      entityId: snap.entityId,
      type: snap.type,
      position: { x: 0, y: 0, z: 0 },
      heading: 0,
      speedKmh: snap.speedKmh,
      health: snap.health,
    };
  }

  setAIInput(entityId: number, input: import('./types').VehicleAIInput): void {
    this.inputs.set(entityId, input);
  }

  spawnVehicle(type: string, position: Vec3): number {
    return this.vehicleService.spawnVehicle(type, position);
  }

  despawnVehicle(entityId: number): void {
    this.inputs.delete(entityId);
  }

  getNearbyVehicles(position: Vec3, radius: number): number[] {
    return this.vehicleService.getNearbyVehicles(position, radius);
  }
}
