export type EntityId = number;

export type SystemName =
  | 'core'
  | 'renderer'
  | 'world'
  | 'physics'
  | 'player'
  | 'vehicles'
  | 'ai'
  | 'audio'
  | 'ui'
  | 'gameplay';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export enum GameState {
  LOADING,
  MENU,
  PLAYING,
  PAUSED,
  CUTSCENE,
  GAME_OVER,
}

export enum DistrictId {
  OCEAN_BEACH,
  DOWNTOWN,
  LITTLE_HAVANA,
  VICE_PORT,
  STARFISH_ISLAND,
}

export interface PlayerStateSnapshot {
  health: number;
  armor: number;
  money: number;
  wantedLevel: number;
  weaponId: string | null;
  position: Vec3;
  isInVehicle: boolean;
  vehicleId: EntityId | null;
}

export interface AssetLoadProgress {
  loaded: number;
  total: number;
  currentFile: string;
  percent: number;
}

export interface AssetManifestEntry {
  url: string;
  type: 'gltf' | 'texture' | 'audio';
}

export interface AssetManifest {
  entries: AssetManifestEntry[];
}

export interface BodyConfig {
  shape: 'box' | 'sphere' | 'capsule' | 'trimesh';
  dimensions: Vec3;
  mass: number;
  position: Vec3;
  collisionGroup: number;
  collisionMask: number;
}

export interface RaycastHit {
  bodyId: number;
  entityId: EntityId;
  point: Vec3;
  normal: Vec3;
  distance: number;
}

export interface IAssetLoader {
  loadManifest(manifest: AssetManifest): Promise<void>;
  get<T>(url: string): T;
  has(url: string): boolean;
  onProgress(callback: (progress: AssetLoadProgress) => void): void;
}

export interface ISystemRegistry {
  register(system: System): void;
  get<T extends System>(name: SystemName): T;
  getAll(): System[];
  getUpdateOrder(): SystemName[];
}

export interface System {
  readonly name: SystemName;
  init(ctx: GameContext): Promise<void>;
  fixedUpdate(dt: number): void;
  update(dt: number): void;
  dispose(): void;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  events: import('./events').EventBus;
  registry: ISystemRegistry;
  assets: IAssetLoader;
  entities: import('../core/EntityManager').EntityManager;
  getSystem<T extends System>(name: SystemName): T;
}
