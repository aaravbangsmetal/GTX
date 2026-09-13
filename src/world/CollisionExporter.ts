import { Mesh, type Object3D } from 'three';
import type { CollisionChunkData } from './types';

const COLLISION_PROP_PREFIXES = ['instanced_', 'prop_'];

export class CollisionExporter {
  private cache = new Map<string, CollisionChunkData>();

  exportChunk(chunkId: string, meshes: Object3D[]): CollisionChunkData {
    const cached = this.cache.get(chunkId);
    if (cached) return cached;

    const vertices: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    for (const root of meshes) {
      root.updateMatrixWorld(true);
      root.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        if (this.shouldSkip(child)) return;

        const geo = child.geometry;
        const posAttr = geo.getAttribute('position');
        if (!posAttr) return;

        const matrix = child.matrixWorld;

        for (let i = 0; i < posAttr.count; i++) {
          const lx = posAttr.getX(i);
          const ly = posAttr.getY(i);
          const lz = posAttr.getZ(i);
          const wx =
            matrix.elements[0] * lx +
            matrix.elements[4] * ly +
            matrix.elements[8] * lz +
            matrix.elements[12];
          const wy =
            matrix.elements[1] * lx +
            matrix.elements[5] * ly +
            matrix.elements[9] * lz +
            matrix.elements[13];
          const wz =
            matrix.elements[2] * lx +
            matrix.elements[6] * ly +
            matrix.elements[10] * lz +
            matrix.elements[14];

          vertices.push(wx, wy, wz);
        }

        const indexAttr = geo.index;
        if (indexAttr) {
          for (let i = 0; i < indexAttr.count; i++) {
            indices.push(vertexOffset + indexAttr.getX(i));
          }
        } else {
          for (let i = 0; i < posAttr.count; i++) {
            indices.push(vertexOffset + i);
          }
        }

        vertexOffset += posAttr.count;
      });
    }

    const data: CollisionChunkData = {
      chunkId,
      vertices: new Float32Array(vertices),
      indices: new Uint32Array(indices),
    };

    this.cache.set(chunkId, data);
    return data;
  }

  getCached(chunkId: string): CollisionChunkData | null {
    return this.cache.get(chunkId) ?? null;
  }

  removeChunk(chunkId: string): void {
    this.cache.delete(chunkId);
  }

  private shouldSkip(mesh: Mesh): boolean {
    const name = mesh.name || mesh.parent?.name || '';
    return COLLISION_PROP_PREFIXES.some((p) => name.startsWith(p));
  }
}
