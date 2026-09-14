import type * as CANNON from 'cannon-es';
import type { IPhysicsService } from '../shared/services';

export interface VehiclePhysicsService extends IPhysicsService {
  getCannonBody(bodyId: number): CANNON.Body;
  getWorld(): CANNON.World;
  step(dt: number): void;
}
