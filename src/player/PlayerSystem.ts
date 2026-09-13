import * as THREE from 'three';
import { PLAYER_SPAWN } from '../shared/constants';
import type { IRendererService, IWorldService } from '../shared/services';
import type { EntityId, GameContext, System, Vec3 } from '../shared/types';
import { DEFAULT_PLAYER_CONFIG } from './PlayerConfig';
import { PlayerController } from './PlayerController';
import { InputManager } from './InputManager';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerModel } from './PlayerModel';
import { PlayerPhysics } from './PlayerPhysics';
import { PlayerStateManager } from './PlayerState';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { asPlayerPhysics, type PlayerPhysicsService } from './physics-bridge';

export class PlayerSystem implements System {
  readonly name = 'player' as const;

  private ctx!: GameContext;
  private input!: InputManager;
  private physics!: PlayerPhysics;
  private camera!: ThirdPersonCamera;
  private model!: PlayerModel;
  private animator!: PlayerAnimator;
  private controller!: PlayerController;
  private state!: PlayerStateManager;
  private entityId: EntityId = 0;
  private config = DEFAULT_PLAYER_CONFIG;
  private physicsService!: PlayerPhysicsService;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.entityId = ctx.entities.createEntity();

    const renderer = ctx.getSystem('renderer') as IRendererService;
    this.physicsService = asPlayerPhysics(ctx.getSystem('physics') as PlayerPhysicsService);

    let spawnPos: Vec3 = { ...PLAYER_SPAWN };
    try {
      const world = ctx.getSystem('world') as IWorldService;
      spawnPos = world.getSpawnPoint('player');
    } catch {
      spawnPos = { ...PLAYER_SPAWN };
    }

    this.input = new InputManager();
    this.input.init(ctx.canvas, ctx.events);

    this.state = new PlayerStateManager(this.config, ctx.events);
    this.physics = new PlayerPhysics(this.physicsService, this.config);
    this.physics.init(spawnPos);

    this.model = new PlayerModel();
    await this.model.load(ctx.assets, renderer);

    const activeCamera = renderer.getActiveCamera();
    if (!(activeCamera instanceof THREE.PerspectiveCamera)) {
      throw new Error('PlayerSystem requires a PerspectiveCamera');
    }

    this.camera = new ThirdPersonCamera(activeCamera, this.config, this.physicsService);
    this.camera.update(spawnPos, this.input.update(), 0);

    this.animator = new PlayerAnimator();
    this.animator.init(this.model.getMixer(), this.model.getClips());

    const meshSync = this.physicsService.getBodyMeshSync?.();
    meshSync?.bind(this.physics.getBodyId(), this.model.getMesh());

    this.controller = new PlayerController(
      this.input,
      this.physics,
      this.camera,
      this.animator,
      this.state,
      this.config,
      ctx.events,
    );

    this.state.setPosition(spawnPos);
    ctx.events.emit('player:spawn', { entityId: this.entityId, position: spawnPos });
    ctx.events.emit('player:stateChange', { state: this.state.getSnapshot() });
  }

  fixedUpdate(dt: number): void {
    this.controller.update(dt);
  }

  update(_dt: number): void {}

  dispose(): void {
    this.input.dispose();
    this.model.dispose();
  }
}
