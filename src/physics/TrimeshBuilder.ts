import * as CANNON from 'cannon-es';
import type { CollisionChunkData } from '../shared/services';
import { CHUNK_SIZE } from '../shared/constants';
import { vec3 } from '../shared/math';
import type { Vec3 } from '../shared/types';
import { BodyFactory } from './BodyFactory';
import { COLLISION_MASKS, CollisionGroup } from './CollisionGroups';
import type { PhysicsWorld } from './PhysicsWorld';

const MAX_VERTICES_PER_CHUNK = 10_000;

function chunkIdToOrigin(chunkId: string): Vec3 {
  const match = chunkId.match(/chunk_(-?\d+)_(-?\d+)/);
  if (!match) return vec3(0, 0, 0);
  const x = Number.parseInt(match[1], 10) * CHUNK_SIZE;
  const z = Number.parseInt(match[2], 10) * CHUNK_SIZE;
  return vec3(x, 0, z);
}

function decimateMesh(
  vertices: Float32Array,
  indices: Uint32Array,
): { vertices: Float32Array; indices: Uint32Array } {
  const vertexCount = vertices.length / 3;
  if (vertexCount <= MAX_VERTICES_PER_CHUNK) {
    return { vertices, indices };
  }

  const stride = Math.ceil(vertexCount / MAX_VERTICES_PER_CHUNK);
  const newIndices = new Uint32Array(Math.ceil(indices.length / (3 * stride)) * 3);
  let writeIndex = 0;

  for (let i = 0; i < indices.length; i += 3 * stride) {
    newIndices[writeIndex++] = indices[i];
    newIndices[writeIndex++] = indices[i + 1];
    newIndices[writeIndex++] = indices[i + 2];
  }

  return {
    vertices,
    indices: newIndices.subarray(0, writeIndex),
  };
}

export class TrimeshBuilder {
  private readonly chunkBodies = new Map<string, CANNON.Body>();
  private readonly bodyFactory: BodyFactory;

  constructor(private readonly physicsWorld: PhysicsWorld) {
    this.bodyFactory = new BodyFactory(physicsWorld.world);
  }

  buildFromChunkData(data: CollisionChunkData): CANNON.Body {
    const existing = this.chunkBodies.get(data.chunkId);
    if (existing) return existing;

    const origin = chunkIdToOrigin(data.chunkId);
    const simplified = decimateMesh(data.vertices, data.indices);
    const body = this.bodyFactory.createTrimesh({
      vertices: simplified.vertices,
      indices: simplified.indices,
      position: origin,
      group: CollisionGroup.STATIC,
      mask: COLLISION_MASKS.STATIC,
    });

    this.chunkBodies.set(data.chunkId, body);
    return body;
  }
}
