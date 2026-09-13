import { Group } from 'three';
import {
  CHUNK_LOAD_RADIUS,
  CHUNK_SIZE,
  CHUNK_UNLOAD_RADIUS,
} from '../shared/constants';
import type { EventBus } from '../shared/events';
import type { IRendererService } from '../shared/services';
import type { Vec3 } from '../shared/types';
import { BuildingGenerator } from './BuildingGenerator';
import { CollisionExporter } from './CollisionExporter';
import { getDistrictAtPosition } from './District';
import { chunkContains } from './geometry-utils';
import { MAP_DATA } from './MapData';
import { PropPlacer } from './PropPlacer';
import type { RoadNetwork } from './RoadNetwork';
import type { ChunkData } from './types';
import { makeChunkId, worldToChunk } from './types';
import type { WorldMaterials } from './WorldMaterials';

const FADE_DURATION = 0.5;

export class ChunkStreamer {
  private loadedChunks = new Map<string, ChunkData>();
  private loadRadius = CHUNK_LOAD_RADIUS;
  private unloadRadius = CHUNK_UNLOAD_RADIUS;
  private buildingGen = new BuildingGenerator();
  private propPlacer: PropPlacer;
  private collisionExporter = new CollisionExporter();
  private roadNetwork: RoadNetwork;
  private events: EventBus | null = null;
  private renderer: IRendererService | null = null;
  private materials: WorldMaterials | null = null;
  constructor(roadNetwork: RoadNetwork, propPlacer: PropPlacer) {
    this.roadNetwork = roadNetwork;
    this.propPlacer = propPlacer;
  }

  setDependencies(
    renderer: IRendererService,
    materials: WorldMaterials,
    events: EventBus,
  ): void {
    this.renderer = renderer;
    this.materials = materials;
    this.events = events;
  }

  update(playerPos: Vec3, dt: number): void {
    if (!this.renderer || !this.materials) return;

    const playerChunk = worldToChunk(playerPos);

    for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
      for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
        const cx = playerChunk.x + dx;
        const cz = playerChunk.z + dz;
        const id = makeChunkId(cx, cz);
        if (!this.loadedChunks.has(id.key)) {
          this.loadChunk(cx, cz);
        }
      }
    }

    for (const [key, chunk] of this.loadedChunks) {
      const dist = Math.max(
        Math.abs(chunk.id.x - playerChunk.x),
        Math.abs(chunk.id.z - playerChunk.z),
      );

      if (dist > this.unloadRadius) {
        this.unloadChunk(key);
        continue;
      }

      if (chunk.fadeProgress < 1) {
        chunk.fadeProgress = Math.min(1, chunk.fadeProgress + dt / FADE_DURATION);
        this.applyFade(chunk);
      }
    }
  }

  getLoadedChunkIds(): string[] {
    return Array.from(this.loadedChunks.keys());
  }

  getChunkGroup(chunkId: string): Group | null {
    return this.loadedChunks.get(chunkId)?.group ?? null;
  }

  getCollisionExporter(): CollisionExporter {
    return this.collisionExporter;
  }

  private loadChunk(cx: number, cz: number): void {
    if (!this.renderer || !this.materials) return;

    const id = makeChunkId(cx, cz);
    const group = this.generateChunk(cx, cz);
    group.name = id.key;
    group.traverse((child) => {
      if ('material' in child && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (m && 'transparent' in m) {
            (m as import('three').Material).transparent = true;
            (m as import('three').Material & { opacity: number }).opacity = 0;
          }
        }
      }
    });

    this.renderer.addToScene(group);

    const centerX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    const centerZ = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
    const district = getDistrictAtPosition(centerX, centerZ);

    const collisionMeshes: import('three').Object3D[] = [];
    group.traverse((child) => {
      if (child.name.startsWith('building_') || child.name.startsWith('road_') || child.name === 'terrain_ground') {
        collisionMeshes.push(child);
      }
    });

    this.collisionExporter.exportChunk(id.key, collisionMeshes);

    const chunkData: ChunkData = {
      id,
      group,
      collisionMeshes,
      district,
      fadeProgress: 0,
    };

    this.loadedChunks.set(id.key, chunkData);
    this.events?.emit('world:chunkLoaded', { chunkId: id.key, district });
  }

  private unloadChunk(key: string): void {
    const chunk = this.loadedChunks.get(key);
    if (!chunk || !this.renderer) return;

    this.renderer.removeFromScene(chunk.group);
    chunk.group.traverse((child) => {
      if ('geometry' in child && child.geometry) {
        (child.geometry as import('three').BufferGeometry).dispose();
      }
    });
    chunk.group.clear();

    this.collisionExporter.removeChunk(key);
    this.loadedChunks.delete(key);
    this.events?.emit('world:chunkUnloaded', { chunkId: key });
  }

  private generateChunk(cx: number, cz: number): Group {
    const group = new Group();
    const materials = this.materials!;

    const roads = this.roadNetwork.getRoadsInChunk(cx, cz, CHUNK_SIZE);
    for (const road of roads) {
      group.add(this.roadNetwork.generateRoadMesh(road, materials));
    }

    const plots = MAP_DATA.buildingPlots.filter((plot) => {
      const bx = plot.rect.x + plot.rect.width / 2;
      const bz = plot.rect.z + plot.rect.depth / 2;
      return chunkContains(cx, cz, bx, bz, CHUNK_SIZE);
    });

    for (const plot of plots) {
      group.add(this.buildingGen.generateBuilding(plot, materials));
    }

    const props = this.propPlacer.getPropsInChunk(cx, cz, CHUNK_SIZE);
    if (props.length > 0) {
      group.add(this.propPlacer.generateChunkProps(props, materials));
    }

    const intersections = this.roadNetwork.getIntersections().filter((inter) =>
      chunkContains(cx, cz, inter.position.x, inter.position.z, CHUNK_SIZE),
    );
    for (const inter of intersections) {
      group.add(this.roadNetwork.generateCrosswalk(inter, materials));
    }

    return group;
  }

  private applyFade(chunk: ChunkData): void {
    const opacity = chunk.fadeProgress;
    chunk.group.traverse((child) => {
      if ('material' in child && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (m && 'opacity' in m) {
            (m as import('three').Material & { opacity: number }).opacity = opacity;
          }
        }
      }
    });
  }

  dispose(): void {
    for (const key of [...this.loadedChunks.keys()]) {
      this.unloadChunk(key);
    }
  }
}
