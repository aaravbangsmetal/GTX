import { BoxGeometry, Group, Mesh } from 'three';
import { PLAYER_SPAWN } from '../shared/constants';
import type { WorldMaterials } from './WorldMaterials';

export class BeachGenerator {
  generateBeach(materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'beach';

    // Sandy strip along east coast
    const sandStrip = new Mesh(new BoxGeometry(200, 0.3, 1000), materials.sand());
    sandStrip.position.set(900, -0.1, 0);
    group.add(sandStrip);

    // Gentle slope mesh overlay
    const slope = new Mesh(new BoxGeometry(30, 0.2, 1000), materials.sand());
    slope.position.set(815, -0.2, 0);
    slope.rotation.z = -0.05;
    group.add(slope);

    // Pier extending 40m into ocean at Z=0
    const pier = new Group();
    pier.name = 'pier';
    const pierDeck = new Mesh(new BoxGeometry(50, 0.3, 6), materials.sidewalk());
    pierDeck.position.set(875, 1, 0);
    pier.add(pierDeck);
    for (let i = 0; i < 10; i++) {
      const piling = new Mesh(new BoxGeometry(0.4, 3, 0.4), materials.sidewalk());
      piling.position.set(850 + i * 5, -0.5, -2);
      pier.add(piling);
      const piling2 = new Mesh(new BoxGeometry(0.4, 3, 0.4), materials.sidewalk());
      piling2.position.set(850 + i * 5, -0.5, 2);
      pier.add(piling2);
    }
    group.add(pier);

    // Boardwalk parallel to beach
    const boardwalk = new Mesh(new BoxGeometry(800, 0.15, 4), materials.sidewalk());
    boardwalk.position.set(500, 0.2, 120);
    group.add(boardwalk);

    const boardwalk2 = new Mesh(new BoxGeometry(800, 0.15, 4), materials.sidewalk());
    boardwalk2.position.set(500, 0.2, -120);
    group.add(boardwalk2);

    // Parking lot at player spawn
    group.add(this.createParkingLot(materials));

    return group;
  }

  private createParkingLot(materials: WorldMaterials): Group {
    const group = new Group();
    group.name = 'spawn_parking_lot';
    group.position.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z);

    const lot = new Mesh(new BoxGeometry(60, 0.05, 40), materials.asphalt());
    lot.position.y = 0.025;
    group.add(lot);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const line = new Mesh(new BoxGeometry(0.1, 0.02, 5), materials.markingWhite());
        line.position.set(-20 + col * 10, 0.04, -12 + row * 12);
        group.add(line);
      }
    }

    const border = new Mesh(new BoxGeometry(62, 0.02, 42), materials.markingYellow());
    border.position.y = 0.03;
    group.add(border);

    return group;
  }
}
