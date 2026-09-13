import { Group } from 'three';
import type { RoadNetwork } from './RoadNetwork';
import type { WorldMaterials } from './WorldMaterials';

export class IntersectionGenerator {
  generateAll(network: RoadNetwork, materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'intersections';

    for (const intersection of network.getIntersections()) {
      const crosswalk = network.generateCrosswalk(intersection, materials);
      group.add(crosswalk);
    }

    return group;
  }
}
