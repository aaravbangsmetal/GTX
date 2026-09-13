import {
  BoxGeometry,
  Group,
  Mesh,
  type Object3D,
} from 'three';
import { BUILDING_PALETTE } from './palette';
import type { BuildingPlot } from './types';
import type { WorldMaterials } from './WorldMaterials';

const FLOOR_HEIGHT = 3.5;

export class BuildingGenerator {
  generateBuilding(plot: BuildingPlot, materials: WorldMaterials): Group {
    return this.generateLOD(plot, 0, materials) as Group;
  }

  generateLOD(plot: BuildingPlot, level: 0 | 1 | 2, materials: WorldMaterials): Object3D {
    const color = BUILDING_PALETTE[plot.colorIndex % BUILDING_PALETTE.length];
    const { width, depth } = plot.rect;
    const totalHeight = plot.floors * FLOOR_HEIGHT;

    const group = new Group();
    group.name = `building_${plot.id}`;
    group.position.set(plot.rect.x + width / 2, 0, plot.rect.z + depth / 2);
    group.rotation.y = plot.rotation;

    if (level === 2) {
      const box = new Mesh(
        new BoxGeometry(width, totalHeight, depth),
        materials.building(color),
      );
      box.position.y = totalHeight / 2;
      group.add(box);
      return group;
    }

    if (level === 1) {
      const box = new Mesh(
        new BoxGeometry(width, totalHeight, depth),
        materials.building(color),
      );
      box.position.y = totalHeight / 2;
      this.addWindowStripes(width, depth, plot.floors, box, materials);
      group.add(box);
      return group;
    }

    switch (plot.style) {
      case 'artdeco':
        this.buildArtDeco(group, plot, materials, color, width, depth, totalHeight);
        break;
      case 'motel':
        this.buildMotel(group, plot, materials, color, width, depth, totalHeight);
        break;
      case 'rowhouse':
        this.buildRowhouse(group, plot, materials, color, width, depth, totalHeight);
        break;
      case 'warehouse':
        this.buildWarehouse(group, plot, materials, color, width, depth, totalHeight);
        break;
      case 'mansion':
        this.buildMansion(group, plot, materials, color, width, depth, totalHeight);
        break;
    }

    return group;
  }

  private buildArtDeco(
    group: Group,
    plot: BuildingPlot,
    materials: WorldMaterials,
    color: string,
    width: number,
    depth: number,
    totalHeight: number,
  ): void {
    const setbackFloors = Math.min(plot.floors, 3);
    const baseFloors = plot.floors - setbackFloors;
    const baseH = baseFloors * FLOOR_HEIGHT;
    const topW = width * 0.75;
    const topD = depth * 0.75;

    const base = new Mesh(new BoxGeometry(width, baseH, depth), materials.building(color));
    base.position.y = baseH / 2;
    this.addWindowGrid(base, plot, materials, width, depth, baseFloors);
    group.add(base);

    if (setbackFloors > 0) {
      const topH = setbackFloors * FLOOR_HEIGHT;
      const top = new Mesh(new BoxGeometry(topW, topH, topD), materials.building(color));
      top.position.y = baseH + topH / 2;
      this.addWindowGrid(top, plot, materials, topW, topD, setbackFloors);
      group.add(top);

      const crown = new Mesh(new BoxGeometry(topW + 0.4, 0.5, topD + 0.4), materials.building('#FF6B9D'));
      crown.position.y = baseH + topH + 0.25;
      group.add(crown);
    }

    if (plot.floors >= 8) {
      const pad = new Mesh(new BoxGeometry(4, 0.1, 4), materials.markingYellow());
      pad.position.y = totalHeight + 0.05;
      group.add(pad);
    }

    const sign = new Mesh(new BoxGeometry(width * 0.4, 1, 0.2), materials.neon('#FF1493'));
    sign.position.set(0, baseH * 0.6, depth / 2 + 0.15);
    group.add(sign);
  }

  private buildMotel(
    group: Group,
    plot: BuildingPlot,
    materials: WorldMaterials,
    color: string,
    width: number,
    depth: number,
    totalHeight: number,
  ): void {
    const main = new Mesh(new BoxGeometry(width, totalHeight, depth * 0.6), materials.building(color));
    main.position.set(0, totalHeight / 2, -depth * 0.1);
    this.addWindowGrid(main, plot, materials, width, depth * 0.6, plot.floors);
    group.add(main);

    for (let f = 1; f <= plot.floors; f++) {
      const rail = new Mesh(
        new BoxGeometry(width * 0.9, 0.1, 0.3),
        materials.building('#FFFFFF'),
      );
      rail.position.set(0, f * FLOOR_HEIGHT - 0.5, depth * 0.25);
      group.add(rail);
    }

    const pool = new Mesh(
      new BoxGeometry(width * 0.4, 0.3, depth * 0.25),
      materials.neon('#00BFFF'),
    );
    pool.position.set(width * 0.2, 0.15, depth * 0.3);
    group.add(pool);
  }

  private buildRowhouse(
    group: Group,
    plot: BuildingPlot,
    materials: WorldMaterials,
    color: string,
    width: number,
    depth: number,
    totalHeight: number,
  ): void {
    const body = new Mesh(new BoxGeometry(width, totalHeight, depth), materials.building(color));
    body.position.y = totalHeight / 2;
    this.addWindowGrid(body, plot, materials, width, depth, plot.floors);
    group.add(body);

    const roof = new Mesh(
      new BoxGeometry(width + 0.5, 0.3, depth + 0.8),
      materials.building('#FA8072'),
    );
    roof.position.y = totalHeight + 0.5;
    roof.rotation.x = 0.15;
    group.add(roof);

    const awning = new Mesh(new BoxGeometry(width * 0.6, 0.05, 1.5), materials.building('#FF8C42'));
    awning.position.set(0, FLOOR_HEIGHT, depth / 2 + 0.75);
    group.add(awning);
  }

  private buildWarehouse(
    group: Group,
    _plot: BuildingPlot,
    materials: WorldMaterials,
    color: string,
    width: number,
    depth: number,
    totalHeight: number,
  ): void {
    const body = new Mesh(new BoxGeometry(width, totalHeight, depth), materials.building('#888888'));
    body.position.y = totalHeight / 2;
    group.add(body);

    const dock = new Mesh(new BoxGeometry(width * 0.3, totalHeight * 0.7, 0.2), materials.building('#555555'));
    dock.position.set(0, totalHeight * 0.35, depth / 2 + 0.1);
    group.add(dock);

    const corrugation = new Mesh(new BoxGeometry(width, 0.2, depth), materials.building(color));
    corrugation.position.y = totalHeight - 0.5;
    group.add(corrugation);
  }

  private buildMansion(
    group: Group,
    plot: BuildingPlot,
    materials: WorldMaterials,
    color: string,
    width: number,
    depth: number,
    totalHeight: number,
  ): void {
    const body = new Mesh(new BoxGeometry(width * 0.7, totalHeight, depth * 0.7), materials.building(color));
    body.position.y = totalHeight / 2;
    this.addWindowGrid(body, plot, materials, width * 0.7, depth * 0.7, plot.floors);
    group.add(body);

    for (const side of [-1, 1]) {
      const column = new Mesh(new BoxGeometry(0.5, totalHeight, 0.5), materials.building('#FFF5E6'));
      column.position.set(side * width * 0.35, totalHeight / 2, depth * 0.35);
      group.add(column);
    }

    const gate = new Mesh(new BoxGeometry(width * 0.4, 1.5, 0.2), materials.building('#333333'));
    gate.position.set(0, 0.75, depth / 2 + 1);
    group.add(gate);

    const drive = new Mesh(new BoxGeometry(width * 0.5, 0.05, depth * 0.4), materials.asphalt());
    drive.position.set(0, 0.025, depth * 0.35);
    group.add(drive);
  }

  private addWindowGrid(
    parent: Mesh,
    _plot: BuildingPlot,
    materials: WorldMaterials,
    width: number,
    depth: number,
    floors: number,
  ): void {
    const winW = 1.2;
    const winH = 1.5;
    const cols = Math.max(2, Math.floor(width / 3));
    const rows = Math.max(1, floors);
    const meshH = floors * FLOOR_HEIGHT;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const win = new Mesh(
          new BoxGeometry(winW, winH, 0.1),
          materials.neon(row % 2 === 0 ? '#00BFFF' : '#FF1493'),
        );
        const x = (col - (cols - 1) / 2) * (width / cols);
        const y = -meshH / 2 + (row + 0.5) * FLOOR_HEIGHT;
        win.position.set(x, y, depth / 2 + 0.06);
        parent.add(win);
      }
    }
  }

  private addWindowStripes(
    width: number,
    depth: number,
    floors: number,
    parent: Mesh,
    materials: WorldMaterials,
  ): void {
    const stripe = new Mesh(
      new BoxGeometry(width * 0.9, floors * 0.3, 0.05),
      materials.neon('#00BFFF'),
    );
    stripe.position.z = depth / 2 + 0.03;
    parent.add(stripe);
  }
}
