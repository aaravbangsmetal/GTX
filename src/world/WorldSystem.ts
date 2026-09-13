import { PLAYER_SPAWN } from '../shared/constants';
import type {
  CollisionChunkData,
  IRendererService,
  IWorldService,
  MinimapData,
  RoadNetworkData,
} from '../shared/services';
import type { GameContext, System, Vec3 } from '../shared/types';
import { BeachGenerator } from './BeachGenerator';
import { ChunkStreamer } from './ChunkStreamer';
import { getDistrictAtPosition } from './District';
import { MAP_DATA, SPAWN_POINTS } from './MapData';
import { MinimapGenerator } from './MinimapData';
import { PropPlacer } from './PropPlacer';
import { RoadNetwork } from './RoadNetwork';
import { Terrain } from './Terrain';
import { WorldMaterials } from './WorldMaterials';
import { MockRendererService } from './__mocks__/MockRendererService';

export class WorldSystem implements System, IWorldService {
  readonly name = 'world' as const;

  private ctx: GameContext | null = null;
  private renderer: IRendererService | null = null;
  private materials: WorldMaterials | null = null;
  private roadNetwork!: RoadNetwork;
  private chunkStreamer!: ChunkStreamer;
  private propPlacer!: PropPlacer;
  private terrain!: Terrain;
  private minimapData!: MinimapData;
  private playerPosition: Vec3 = { ...PLAYER_SPAWN };
  private currentDistrict = getDistrictAtPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.z);
  private onPlayerMove: ((payload: { position: Vec3 }) => void) | null = null;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;

    try {
      const rendererSystem = ctx.getSystem('renderer');
      if ('getScene' in rendererSystem && typeof rendererSystem.getScene === 'function') {
        this.renderer = rendererSystem as unknown as IRendererService;
      } else {
        this.renderer = new MockRendererService(ctx.canvas);
      }
    } catch {
      this.renderer = new MockRendererService(ctx.canvas);
    }

    this.materials = new WorldMaterials(this.renderer);
    this.roadNetwork = new RoadNetwork(MAP_DATA);
    this.propPlacer = new PropPlacer();
    this.terrain = new Terrain();
    this.chunkStreamer = new ChunkStreamer(this.roadNetwork, this.propPlacer);
    this.chunkStreamer.setDependencies(this.renderer, this.materials, ctx.events);

    const minimapGen = new MinimapGenerator();
    this.minimapData = minimapGen.generate(MAP_DATA, this.roadNetwork);

    const beachGen = new BeachGenerator();
    this.renderer.addToScene(this.terrain.generateGroundMesh(this.materials));
    this.renderer.addToScene(this.terrain.generateBridges(this.materials));
    this.renderer.addToScene(this.terrain.generateHarborDocks(this.materials));
    this.renderer.addToScene(beachGen.generateBeach(this.materials));

    this.onPlayerMove = (payload) => {
      this.playerPosition = payload.position;
    };
    ctx.events.on('player:move', this.onPlayerMove);

    this.chunkStreamer.update(this.playerPosition, 0);
  }

  fixedUpdate(_dt: number): void {
    // World streaming runs in variable update
  }

  update(dt: number): void {
    if (!this.chunkStreamer) return;

    this.chunkStreamer.update(this.playerPosition, dt);

    const district = getDistrictAtPosition(this.playerPosition.x, this.playerPosition.z);
    if (district !== this.currentDistrict) {
      this.currentDistrict = district;
      this.ctx?.events.emit('world:playerDistrictChange', { district });
    }
  }

  dispose(): void {
    if (this.ctx && this.onPlayerMove) {
      this.ctx.events.off('player:move', this.onPlayerMove);
    }
    this.chunkStreamer?.dispose();
    this.materials?.dispose();
  }

  getRoadNetwork(): RoadNetworkData {
    const data = this.roadNetwork.getData();
    return {
      segments: data.segments,
      intersections: data.intersections,
    };
  }

  getMinimapData(): MinimapData {
    return this.minimapData;
  }

  getDistrictAt(position: Vec3): number {
    return getDistrictAtPosition(position.x, position.z);
  }

  getSpawnPoint(id: string): Vec3 {
    const point = SPAWN_POINTS[id as keyof typeof SPAWN_POINTS];
    if (!point) {
      return { ...PLAYER_SPAWN };
    }
    return { ...point };
  }

  getCollisionData(chunkId: string): CollisionChunkData {
    const cached = this.chunkStreamer.getCollisionExporter().getCached(chunkId);
    if (cached) return cached;

    const group = this.chunkStreamer.getChunkGroup(chunkId);
    if (group) {
      const meshes: import('three').Object3D[] = [];
      group.traverse((child) => {
        if (child.name.startsWith('building_') || child.name.startsWith('road_')) {
          meshes.push(child);
        }
      });
      return this.chunkStreamer.getCollisionExporter().exportChunk(chunkId, meshes);
    }

    return {
      chunkId,
      vertices: new Float32Array(0),
      indices: new Uint32Array(0),
    };
  }
}
