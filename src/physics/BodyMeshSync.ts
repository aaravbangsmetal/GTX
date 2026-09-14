import type { Object3D } from 'three';
import type { Vec3 } from '../shared/types';
import type * as CANNON from 'cannon-es';

interface SyncPair {
  mesh: Object3D;
  body: CANNON.Body;
  offset?: Vec3;
}

export class BodyMeshSync {
  private readonly pairs = new Map<number, SyncPair>();
  private resolveBody: ((bodyId: number) => CANNON.Body | undefined) | null = null;

  setBodyResolver(resolver: (bodyId: number) => CANNON.Body | undefined): void {
    this.resolveBody = resolver;
  }

  bind(bodyId: number, mesh: Object3D, body?: CANNON.Body, offset?: Vec3): void {
    const resolved = body ?? this.resolveBody?.(bodyId);
    if (!resolved) return;
    this.pairs.set(bodyId, { mesh, body: resolved, offset });
  }

  unbind(bodyId: number): void {
    this.pairs.delete(bodyId);
  }

  sync(): void {
    for (const { mesh, body, offset } of this.pairs.values()) {
      if (!body?.position) continue;
      if (offset) {
        mesh.position.set(
          body.position.x + offset.x,
          body.position.y + offset.y,
          body.position.z + offset.z,
        );
      } else {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
      }
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
    }
  }
}
