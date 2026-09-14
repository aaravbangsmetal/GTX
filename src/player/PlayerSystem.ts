import * as THREE from 'three';
import { PLAYER_SPAWN } from '../shared/constants';
import type { IPlayerService, IRendererService, IWorldService } from '../shared/services';
import type { EntityId, GameContext, PlayerStateSnapshot, System, Vec3 } from '../shared/types';
import { DEFAULT_PLAYER_CONFIG } from './PlayerConfig';
import { PlayerController } from './PlayerController';
import { InputManager } from './InputManager';
import { PlayerAnimator } from './PlayerAnimator';
import { PlayerModel } from './PlayerModel';
import { PlayerPhysics } from './PlayerPhysics';
import { PlayerStateManager } from './PlayerState';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { asPlayerPhysics, type PlayerPhysicsService } from './physics-bridge';
import { PlayerMode } from './types';

export class PlayerSystem implements System, IPlayerService {
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

    const renderer = ctx.getSystem('renderer') as unknown as IRendererService;
    this.physicsService = asPlayerPhysics(
      ctx.getSystem('physics') as unknown as PlayerPhysicsService,
    );

    let spawnPos: Vec3 = { ...PLAYER_SPAWN };
    try {
      const world = ctx.getSystem('world') as unknown as IWorldService;
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

    this.bindVehicleEvents();
  }

  private bindVehicleEvents(): void {
    this.ctx.events.on('player:enterVehicle', ({ playerId, vehicleId, seat }) => {
      if (playerId !== this.entityId) return;

      const mode =
        seat === 'driver' ? PlayerMode.IN_VEHICLE_DRIVER : PlayerMode.IN_VEHICLE_PASSENGER;
      this.state.setMode(mode, vehicleId);
      this.model.setVisible(false);
      this.physics.setEnabled(false);
    });

    this.ctx.events.on('player:exitVehicle', ({ playerId, position }) => {
      if (playerId !== this.entityId) return;

      this.state.setMode(PlayerMode.ON_FOOT);
      this.physics.setEnabled(true);
      this.physics.teleport(position);
      this.model.setVisible(true);
      this.state.setPosition(position);
      this.camera.snapTo(position);
    });
  }

  fixedUpdate(dt: number): void {
    this.controller.update(dt);
  }

  update(dt: number): void {
    this.controller.updateCamera(dt);
    this.model.getMixer()?.update(dt);
  }

  dispose(): void {
    this.input.dispose();
    this.model.dispose();
  }

  getState(): PlayerStateSnapshot {
    return this.state.getSnapshot();
  }

  getEntityId(): EntityId {
    return this.entityId;
  }

  getPosition(): Vec3 {
    return this.physics.getPosition();
  }

  isControllable(): boolean {
    return this.state.getMode() === PlayerMode.ON_FOOT && this.state.isAlive();
  }

  teleport(position: Vec3): void {
    this.physics.teleport(position);
    this.state.setPosition(position);
  }

  getSnapshot(): PlayerStateSnapshot {
    return this.state.getSnapshot();
  }

  setHealth(value: number): void {
    this.state.setHealth(value);
  }

  setArmor(value: number): void {
    this.state.setArmor(value);
  }

  addMoney(amount: number): void {
    this.state.addMoney(amount);
  }

  setWantedLevel(level: number): void {
    this.state.setWantedLevel(level);
  }

  setWeapon(id: string | null): void {
    this.state.setWeapon(id);
  }

  applyDamage(amount: number): void {
    const health = this.state.getSnapshot().health;
    this.state.setHealth(health - amount);
  }
}
