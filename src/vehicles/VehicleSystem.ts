import { PerspectiveCamera } from 'three';
import type { AIVehicleState, VehicleAIInput } from '../ai/types';
import { distance3 } from '../shared/math';
import type { EventBus } from '../shared/events';
import type {
  EntityId,
  GameContext,
  System,
  Vec3,
} from '../shared/types';
import type { IPlayerService, IRendererService, IVehicleService, VehicleSnapshot as ServiceVehicleSnapshot } from '../shared/services';
import { EnterExit } from './EnterExit';
import type { VehiclePhysicsService } from './physics-service';
import { Vehicle } from './Vehicle';
import { VehicleCamera } from './VehicleCamera';
import { VehicleSpawner } from './VehicleSpawner';
import { VehicleState, type VehicleInput, type VehicleTypeId } from './types';

const KEY_BINDINGS: Record<string, string> = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'handbrake',
  KeyE: 'interact',
};

export class VehicleSystem implements System, IVehicleService {
  readonly name = 'vehicles' as const;

  private events!: EventBus;
  private vehicles = new Map<EntityId, Vehicle>();
  private enterExit!: EnterExit;
  private vehicleCamera = new VehicleCamera();
  private spawner!: VehicleSpawner;
  private physics!: VehiclePhysicsService;
  private renderer!: IRendererService;
  private player!: IPlayerService;
  private activeVehicleId: EntityId | null = null;
  private keysDown = new Set<string>();
  private lastSpeedKmh = 0;
  private aiInputs = new Map<EntityId, VehicleInput>();

  async init(ctx: GameContext): Promise<void> {
    this.events = ctx.events;
    this.renderer = ctx.getSystem('renderer') as unknown as IRendererService;
    this.physics = ctx.getSystem('physics') as unknown as VehiclePhysicsService;
    this.player = ctx.getSystem('player') as unknown as IPlayerService;

    this.enterExit = new EnterExit(this.vehicles, this.events);
    this.spawner = new VehicleSpawner(
      this.vehicles,
      ctx,
      this.physics,
      this.renderer,
      this.events,
    );

    await this.spawner.spawnInitialVehicles();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.events.on('player:enterVehicle', ({ vehicleId }) => {
      this.activeVehicleId = vehicleId;
      const cam = this.renderer.getActiveCamera();
      if (cam instanceof PerspectiveCamera) {
        this.vehicleCamera.activate(cam);
      }
    });

    this.events.on('player:exitVehicle', () => {
      this.activeVehicleId = null;
      this.vehicleCamera.deactivate();
    });

    this.events.on('physics:collision', ({ entityA, entityB, impulse }) => {
      this.handleCollision(entityA, entityB, impulse);
    });
  }

  fixedUpdate(dt: number): void {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state === VehicleState.DESTROYED) continue;

      if (
        vehicle.state === VehicleState.DRIVEN &&
        vehicle.entityId === this.activeVehicleId
      ) {
        const input = this.getDrivingInput();
        const result = vehicle.physics.update(input, dt);

        if (Math.abs(result.speedKmh - this.lastSpeedKmh) > 0.5) {
          this.events.emit('vehicle:speedChange', {
            vehicleId: vehicle.entityId,
            speedKmh: result.speedKmh,
          });
          this.lastSpeedKmh = result.speedKmh;
        }

        this.events.emit('vehicle:enginePitch', {
          vehicleId: vehicle.entityId,
          rpm: result.rpm,
          speed: result.speed,
        });
        continue;
      }

      if (vehicle.state === VehicleState.AI_CONTROLLED) {
        const input = this.aiInputs.get(vehicle.entityId) ?? {
          throttle: 0,
          steer: 0,
          brake: false,
          handbrake: false,
        };
        vehicle.physics.update(input, dt);
      }
    }
  }

  update(dt: number): void {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state !== VehicleState.DESTROYED) {
        vehicle.syncVisuals();
      }
    }

    if (this.activeVehicleId) {
      const vehicle = this.vehicles.get(this.activeVehicleId);
      if (vehicle) {
        this.vehicleCamera.update(
          vehicle.physics.getPosition(),
          vehicle.physics.getHeading(),
          vehicle.physics.getSpeed(),
          dt,
        );
        vehicle.model.updateWheels(vehicle.physics.wheels);
      }
    } else {
      this.updateInteractPrompt();
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    for (const vehicle of this.vehicles.values()) {
      vehicle.dispose(this.renderer);
    }
    this.vehicles.clear();
  }

  getVehicle(entityId: EntityId): ServiceVehicleSnapshot | null {
    const vehicle = this.vehicles.get(entityId);
    if (!vehicle) return null;
    const snap = vehicle.getSnapshot();
    return {
      entityId: snap.entityId,
      type: snap.type,
      speedKmh: snap.speedKmh,
      health: snap.health,
    };
  }

  getPlayerVehicle(): EntityId | null {
    return this.activeVehicleId;
  }

  getNearbyVehicles(position: Vec3, radius: number): EntityId[] {
    const result: EntityId[] = [];
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.state === VehicleState.DESTROYED) continue;
      if (distance3(position, vehicle.physics.getPosition()) <= radius) {
        result.push(vehicle.entityId);
      }
    }
    return result;
  }

  spawnVehicle(type: string, position: Vec3): EntityId {
    return this.spawner.spawnSync(type as VehicleTypeId, position);
  }

  getState(entityId: EntityId): AIVehicleState | null {
    const vehicle = this.vehicles.get(entityId);
    if (!vehicle) return null;
    const snap = vehicle.getSnapshot();
    return {
      entityId: snap.entityId,
      type: snap.type,
      position: snap.position,
      heading: snap.heading,
      speedKmh: snap.speedKmh,
      health: snap.health,
    };
  }

  setAIInput(entityId: EntityId, input: VehicleAIInput): void {
    const vehicle = this.vehicles.get(entityId);
    if (!vehicle || vehicle.state === VehicleState.DESTROYED) return;
    if (vehicle.state === VehicleState.DRIVEN) return;

    vehicle.state = VehicleState.AI_CONTROLLED;
    this.aiInputs.set(entityId, {
      throttle: input.throttle,
      steer: input.steer,
      brake: input.brake > 0,
      handbrake: false,
    });
  }

  despawnVehicle(entityId: EntityId): void {
    if (this.activeVehicleId === entityId) {
      this.activeVehicleId = null;
      this.vehicleCamera.deactivate();
    }
    this.aiInputs.delete(entityId);
    this.spawner.despawn(entityId);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (KEY_BINDINGS[e.code]) {
      this.keysDown.add(e.code);
    }
    if (e.code === 'KeyE') {
      this.handleInteract();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private handleInteract(): void {
    const playerId = this.player.getEntityId();
    const playerPos = this.player.getPosition();

    if (this.activeVehicleId) {
      const exitPos = this.enterExit.exit(playerId, this.activeVehicleId);
      if (exitPos) {
        this.player.teleport(exitPos);
      }
      return;
    }

    const entered = this.enterExit.tryEnter(playerId, playerPos);
    if (entered) {
      for (const vehicle of this.vehicles.values()) {
        if (vehicle.driverId === playerId) {
          this.activeVehicleId = vehicle.entityId;
          const cam = this.renderer.getActiveCamera();
          if (cam instanceof PerspectiveCamera) {
            this.vehicleCamera.activate(cam);
          }
          break;
        }
      }
    }
  }

  private getDrivingInput(): VehicleInput {
    const forward = this.keysDown.has('KeyW');
    const backward = this.keysDown.has('KeyS');
    const left = this.keysDown.has('KeyA');
    const right = this.keysDown.has('KeyD');
    const handbrake = this.keysDown.has('Space');

    let throttle = 0;
    if (forward) throttle += 1;
    if (backward) throttle -= 1;

    let steer = 0;
    if (left) steer -= 1;
    if (right) steer += 1;

    const brake = backward && !forward;

    return { throttle, steer, brake, handbrake };
  }

  private updateInteractPrompt(): void {
    const nearest = this.enterExit.findNearestVehicle(this.player.getPosition());
    this.events.emit('player:interactPrompt', {
      text: nearest ? 'Press E to enter vehicle' : '',
      targetId: nearest,
    });
  }

  private handleCollision(entityA: EntityId, entityB: EntityId, impulse: number): void {
    const vehicle = this.vehicles.get(entityA) ?? this.vehicles.get(entityB);
    if (!vehicle || impulse < 1) return;
    const damage = Math.min(impulse * 2, 25);
    vehicle.damage.takeDamage(damage, vehicle.physics.getPosition());
    if (vehicle.damage.getHealth() <= 0) {
      this.spawner.despawn(vehicle.entityId);
      if (this.activeVehicleId === vehicle.entityId) {
        this.activeVehicleId = null;
        this.vehicleCamera.deactivate();
      }
    }
  }
}
