import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { Howl } from 'howler';
import type { AssetLoadProgress, AssetManifest, IAssetLoader } from '../shared/types';
import { logger } from '../shared/logger';

export class AssetLoader implements IAssetLoader {
  private cache = new Map<string, unknown>();
  private progressHandlers = new Set<(progress: AssetLoadProgress) => void>();
  private gltfLoader = new GLTFLoader();
  private textureLoader = new TextureLoader();

  onProgress(callback: (progress: AssetLoadProgress) => void): void {
    this.progressHandlers.add(callback);
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  get<T>(url: string): T {
    const asset = this.cache.get(url);
    if (!asset) {
      throw new Error(`Asset not loaded: ${url}`);
    }
    return asset as T;
  }

  async loadManifest(manifest: AssetManifest): Promise<void> {
    const total = manifest.entries.length;
    let loaded = 0;

    for (const entry of manifest.entries) {
      try {
        if (entry.type === 'gltf') {
          const gltf = await this.gltfLoader.loadAsync(entry.url);
          this.cache.set(entry.url, gltf);
        } else if (entry.type === 'texture') {
          const texture = await this.textureLoader.loadAsync(entry.url);
          this.cache.set(entry.url, texture);
        } else {
          const howl = await new Promise<Howl>((resolve, reject) => {
            const sound = new Howl({
              src: [entry.url],
              onload: () => resolve(sound),
              onloaderror: (_id, error) => reject(error),
            });
          });
          this.cache.set(entry.url, howl);
        }
      } catch (error) {
        logger.warn('assets', `Failed to load ${entry.url}`, error);
      }

      loaded += 1;
      const progress: AssetLoadProgress = {
        loaded,
        total,
        currentFile: entry.url,
        percent: total === 0 ? 100 : (loaded / total) * 100,
      };
      for (const handler of this.progressHandlers) {
        handler(progress);
      }
    }
  }
}
