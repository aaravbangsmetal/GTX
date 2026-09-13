import * as CANNON from 'cannon-es';

export class ConstraintManager {
  constructor(private readonly world: CANNON.World) {}

  createLock(bodyA: CANNON.Body, bodyB: CANNON.Body): CANNON.PointToPointConstraint {
    const constraint = new CANNON.PointToPointConstraint(
      bodyA,
      new CANNON.Vec3(0, 0, 0),
      bodyB,
      new CANNON.Vec3(0, 0, 0),
    );
    this.world.addConstraint(constraint);
    return constraint;
  }

  removeConstraint(constraint: CANNON.Constraint): void {
    this.world.removeConstraint(constraint);
  }
}
