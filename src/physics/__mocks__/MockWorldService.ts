import type { CollisionChunkData, IWorldService } from '../../shared/services';
import { vec3 } from '../../shared/math';
import type { Vec3 } from '../../shared/types';

export class MockWorldService implements IWorldService {
  private readonly chunks = new Map<string, CollisionChunkData>();

  setChunkData(data: CollisionChunkData): void {
    this.chunks.set(data.chunkId, data);
  }

  getRoadNetwork() {
    return { segments: [], intersections: [] };
  }

  getMinimapData() {
    return {
      width: 0,
      height: 0,
      roads: [],
      districts: [],
      landmarks: [],
      waterBoundary: [],
    };
  }

  getDistrictAt(_position: Vec3): number {
    return 0;
  }

  getSpawnPoint(_id: string): Vec3 {
    return vec3();
  }

  getCollisionData(chunkId: string): CollisionChunkData {
    const data = this.chunks.get(chunkId);
    if (!data) {
      throw new Error(`Mock collision data missing for ${chunkId}`);
    }
    return data;
  }
}
