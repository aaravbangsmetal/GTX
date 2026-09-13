import { distance3, normalize3 } from '../shared/math';
import type { EntityId, Vec3 } from '../shared/types';
import type { IPhysicsService } from '../shared/services';
import type { RoadPathfinder } from './Pathfinder';
import { TrafficLightManager } from './TrafficLightManager';
import type { AiIntersection, IVehicleAIControl, TrafficVehicleConfig } from './types';

const WAYPOINT_THRESHOLD = 3;
const AVOIDANCE_DISTANCE = 10;
const INTERSECTION_CHECK_RADIUS = 15;

export class TrafficAI {
  private path: Vec3[] = [];
  private pathIndex = 0;
  private currentSpeed = 0;
  private targetSpeed = 40;
  private entityId: EntityId;
  private vehicleControl: IVehicleAIControl;
  private roadPathfinder: RoadPathfinder;
  private trafficLights: TrafficLightManager;
  private physics: IPhysicsService;
  private intersections: AiIntersection[];
  private config: TrafficVehicleConfig;
  private stoppedAtLight = false;

  constructor(
    entityId: EntityId,
    vehicleControl: IVehicleAIControl,
    roadPathfinder: RoadPathfinder,
    trafficLights: TrafficLightManager,
    physics: IPhysicsService,
    intersections: AiIntersection[],
    destination: Vec3,
    config: TrafficVehicleConfig,
  ) {
    this.entityId = entityId;
    this.vehicleControl = vehicleControl;
    this.roadPathfinder = roadPathfinder;
    this.trafficLights = trafficLights;
    this.physics = physics;
    this.intersections = intersections;
    this.config = config;
    this.targetSpeed = config.maxSpeed;
    this.path = roadPathfinder.findPath(
      vehicleControl.getState(entityId)?.position ?? destination,
      destination,
    );
  }

  update(dt: number): void {
    const state = this.vehicleControl.getState(this.entityId);
    if (!state) return;

    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.pickNewDestination(state.position);
      return;
    }

    const waypoint = this.path[this.pathIndex];
    const dist = distance3(state.position, waypoint);

    if (dist < WAYPOINT_THRESHOLD) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.pickNewDestination(state.position);
        return;
      }
    }

    const nextWaypoint = this.path[this.pathIndex];
    const shouldStop = this.checkTrafficLight(state.position);
    const avoidanceBrake = this.checkAvoidance(state);

    let throttle = 0;
    let brake = 0;
    let steer = 0;

    if (shouldStop || avoidanceBrake) {
      brake = 1;
      this.currentSpeed = Math.max(0, this.currentSpeed - 20 * dt);
      this.stoppedAtLight = shouldStop;
    } else {
      this.stoppedAtLight = false;
      const targetMs = (this.targetSpeed / 3.6);
      if (this.currentSpeed < targetMs) {
        this.currentSpeed = Math.min(targetMs, this.currentSpeed + 5 * dt);
        throttle = 0.6;
      } else {
        throttle = 0.3;
      }

      const dir = normalize3({
        x: nextWaypoint.x - state.position.x,
        y: 0,
        z: nextWaypoint.z - state.position.z,
      });
      const targetHeading = Math.atan2(dir.x, dir.z);
      const headingDiff = targetHeading - state.heading;
      steer = Math.max(-1, Math.min(1, headingDiff * 2));
    }

    this.vehicleControl.setAIInput(this.entityId, { throttle, brake, steer });
  }

  private pickNewDestination(currentPos: Vec3): void {
    const dest = this.roadPathfinder.getRandomRoadPoint(currentPos, 100, 300);
    this.path = this.roadPathfinder.findPath(currentPos, dest);
    this.pathIndex = 0;
  }

  private checkTrafficLight(position: Vec3): boolean {
    for (const inter of this.intersections) {
      if (!inter.hasTrafficLight) continue;
      const dist = distance3(position, inter.position);
      if (dist < INTERSECTION_CHECK_RADIUS) {
        return this.trafficLights.shouldStop(inter.id);
      }
    }
    return false;
  }

  private checkAvoidance(state: { position: Vec3; heading: number }): boolean {
    const forward = {
      x: Math.sin(state.heading),
      y: 0,
      z: Math.cos(state.heading),
    };

    const hit = this.physics.raycast(state.position, forward, AVOIDANCE_DISTANCE);
    if (hit) return true;

    const nearby = this.vehicleControl.getNearbyVehicles(state.position, AVOIDANCE_DISTANCE);
    for (const id of nearby) {
      if (id === this.entityId) continue;
      const other = this.vehicleControl.getState(id);
      if (other && distance3(state.position, other.position) < this.config.followDistance) {
        return true;
      }
    }

    return false;
  }

  getEntityId(): EntityId {
    return this.entityId;
  }

  isStoppedAtLight(): boolean {
    return this.stoppedAtLight;
  }
}

export function getTrafficSpawnPosition(
  roadPathfinder: RoadPathfinder,
  point: { roadId: string; t: number; lane: number; direction: 1 | -1 },
): Vec3 {
  return roadPathfinder.getLanePosition(point.roadId, point.t, point.lane, point.direction);
}
