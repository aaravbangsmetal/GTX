import { vec3 } from '../shared/math';
import type { VehicleTypeConfig, VehicleTypeId } from './types';

export const VEHICLE_TYPES: Partial<Record<VehicleTypeId, VehicleTypeConfig>> = {
  sedan: {
    id: 'sedan',
    name: 'Cheetah',
    mass: 1200,
    maxSpeed: 33.3,
    acceleration: 8,
    brakeForce: 15,
    steerSpeed: 2.5,
    grip: 0.85,
    suspensionStiffness: 30,
    suspensionDamping: 4.5,
    suspensionRestLength: 0.3,
    engineForce: 3000,
    dimensions: vec3(4.5, 1.4, 1.8),
    wheelRadius: 0.35,
    wheelCount: 4,
    modelPath: '/assets/vehicles/models/sedan.glb',
    seatOffset: vec3(-0.4, 0.5, 0.3),
  },
};

export function getVehicleType(id: VehicleTypeId): VehicleTypeConfig {
  const config = VEHICLE_TYPES[id];
  if (!config) throw new Error(`Unknown vehicle type: ${id}`);
  return config;
}
