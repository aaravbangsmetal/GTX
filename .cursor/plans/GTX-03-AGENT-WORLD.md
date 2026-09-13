# Agent 3: World Map and Level Design

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 3 |
| Branch | `agent-03-world` |
| Owns | `src/world/`, `public/assets/world/` |
| Merge order | Wave 1 (parallel with 2, 4 after Agent 1) |
| Wave | 1 |

---

## Central Context

GTX is a browser GTA Vice City game. Agent 1 provides contracts. Agent 2 provides the rendering pipeline (scene, materials, LOD). **You build the entire city** — districts, roads, buildings, props, terrain, ocean beach, chunk streaming. Your map data feeds Agent 4 (collision), Agent 7 (traffic paths), and Agent 9 (minimap).

The map is **2km × 2km**, 5 districts, Vice City inspired. Compact but dense with personality.

---

## Your Mission

Create a procedural + data-driven Vice City map with chunk streaming, road network, building generation, prop placement, terrain, and collision mesh export. Implement `IWorldService`.

---

## File Checklist

```
src/world/
  index.ts
  createSystem.ts
  types.ts
  WorldSystem.ts
  MapData.ts
  District.ts
  RoadNetwork.ts
  BuildingGenerator.ts
  ChunkStreamer.ts
  PropPlacer.ts
  Terrain.ts
  CollisionExporter.ts
  MinimapData.ts
  IntersectionGenerator.ts
  BeachGenerator.ts
  __mocks__/
    MockRendererService.ts
public/assets/world/
  props/
    palm-tree.glb
    bench.glb
    street-lamp.glb
    trash-can.glb
    neon-sign.glb
    bus-stop.glb
```

---

## Detailed Implementation Spec

### 1. `src/world/types.ts`

```typescript
export interface ChunkId { x: number; z: number; key: string; } // key = "chunk_8_4"

export interface BuildingPlot {
  id: string;
  rect: { x: number; z: number; width: number; depth: number };
  floors: number;
  style: 'artdeco' | 'motel' | 'rowhouse' | 'warehouse' | 'mansion';
  colorIndex: number;  // 0-5 pastel palette index
  district: DistrictId;
  rotation: number;    // radians, aligned to road
}

export interface RoadSegment {
  id: string;
  type: 'highway' | 'boulevard' | 'street' | 'alley';
  lanes: number;
  points: Vec3[];       // spline control points
  width: number;        // meters
  hasSidewalk: boolean;
  speedLimit: number;   // km/h
  district: DistrictId;
}

export interface Intersection {
  id: string;
  position: Vec3;
  connectedRoads: string[];  // road segment IDs
  hasTrafficLight: boolean;
  type: 'cross' | 't' | 'roundabout';
}

export interface PropPlacement {
  type: 'palm' | 'bench' | 'lamp' | 'trash' | 'neon' | 'busstop' | 'umbrella' | 'container';
  position: Vec3;
  rotation: number;
  scale: number;
  district: DistrictId;
}

export interface RoadNetworkData {
  segments: RoadSegment[];
  intersections: Intersection[];
  sidewalks: Vec3[][];  // polylines
  getNearestRoad(pos: Vec3): { segment: RoadSegment; t: number; point: Vec3 };
  getPath(from: Vec3, to: Vec3): Vec3[];  // for traffic AI
}

export interface MinimapData {
  width: number;
  height: number;
  roads: Array<{ points: Vec2[]; width: number; type: string }>;
  districts: Array<{ id: DistrictId; polygon: Vec2[]; color: string }>;
  landmarks: Array<{ id: string; position: Vec2; label: string }>;
  waterBoundary: Vec2[];  // ocean edge polygon
}

export interface CollisionChunkData {
  chunkId: string;
  vertices: Float32Array;
  indices: Uint32Array;
}
```

### 2. `src/world/MapData.ts`
**The master city layout.** All coordinates in meters, Y-up.

```typescript
export const MAP_DATA = {
  districts: [
    {
      id: DistrictId.OCEAN_BEACH,
      bounds: { minX: 0, maxX: 1000, minZ: -500, maxZ: 500 },
      buildingDensity: 0.4,
      maxFloors: 4,
      styles: ['motel', 'artdeco'],
      propDensity: 0.6,
    },
    {
      id: DistrictId.DOWNTOWN,
      bounds: { minX: -400, maxX: 200, minZ: -200, maxZ: 400 },
      buildingDensity: 0.8,
      maxFloors: 12,
      styles: ['artdeco'],
      propDensity: 0.5,
    },
    // ... LITTLE_HAVANA, VICE_PORT, STARFISH_ISLAND
  ],

  roads: [
    // Highway loop (outer ring)
    { id: 'hwy_north', type: 'highway', lanes: 4, points: [...], width: 16 },
    { id: 'hwy_south', type: 'highway', lanes: 4, points: [...], width: 16 },
    { id: 'hwy_east', type: 'highway', lanes: 4, points: [...], width: 16 },
    { id: 'hwy_west', type: 'highway', lanes: 4, points: [...], width: 16 },

    // Main boulevards
    { id: 'blvd_ocean', type: 'boulevard', lanes: 4, points: [...], width: 14 },
    { id: 'blvd_downtown', type: 'boulevard', lanes: 4, points: [...], width: 14 },
    { id: 'blvd_havana', type: 'boulevard', lanes: 4, points: [...], width: 14 },

    // Side streets (grid within districts)
    // Generate 20+ street segments connecting boulevards
  ],

  intersections: [
    { id: 'int_ocean_downtown', position: { x: 0, y: 0, z: 0 }, connectedRoads: ['blvd_ocean', 'blvd_downtown'], hasTrafficLight: true, type: 'cross' },
    // 15+ intersections
  ],

  spawnPoints: {
    player: { x: 200, y: 2, z: -150 },
    mission_1_target: { x: -50, y: 2, z: 100 },
    mission_2_area: { x: -400, y: 2, z: 50 },
    mission_3_pickup: { x: -300, y: 2, z: -400 },
    mission_3_delivery: { x: 100, y: 2, z: 600 },
    police_station: { x: -100, y: 2, z: 0 },
    hospital: { x: 150, y: 2, z: -50 },
  },

  buildingPlots: [
    // 200+ plots generated from district bounds + road adjacency
    // Algorithm: subdivide district bounds along roads, assign style/floors
  ],
};
```

### 3. `src/world/RoadNetwork.ts`

```typescript
export class RoadNetwork {
  private segments: RoadSegment[];
  private intersections: Intersection[];
  private graph: Map<string, string[]>; // adjacency for pathfinding

  constructor(mapData: typeof MAP_DATA);
  getData(): RoadNetworkData;

  // Road mesh generation:
  generateRoadMesh(segment: RoadSegment, materials: MaterialLibrary): THREE.Group;
  // - Extrude flat strip along spline points
  // - Lane markings: white dashed center, yellow edge lines
  // - Sidewalk: raised 0.15m, concrete material, 2m wide each side
  // - Crosswalks at intersections (white stripes)

  getNearestRoad(pos: Vec3): { segment: RoadSegment; t: number; point: Vec3 };
  getPath(from: Vec3, to: Vec3): Vec3[];  // A* on road graph
  getLanePosition(segmentId: string, t: number, lane: number): Vec3;
}
```

Road widths:
| Type | Width | Lanes | Sidewalk |
|------|-------|-------|----------|
| highway | 16m | 4 | no |
| boulevard | 14m | 4 | yes, 2m each side |
| street | 8m | 2 | yes, 1.5m each side |
| alley | 5m | 1 | no |

### 4. `src/world/BuildingGenerator.ts`

```typescript
export class BuildingGenerator {
  generateBuilding(plot: BuildingPlot, materials: MaterialLibrary): THREE.Group;
  generateLOD(plot: BuildingPlot, level: 0 | 1 | 2): THREE.Object3D;

  // LOD 0 (full): Procedural geometry
  //   - Box base per floor, stacked
  //   - Window grid on front/back faces (emissive material)
  //   - Roof: flat (artdeco), pitched (rowhouse), helipad (tall downtown)
  //   - Crown/parapet detail on art deco
  //   - Color from pastel palette index
  //   - ~500-2000 triangles per building

  // LOD 1 (medium): Simplified box + window texture baked
  //   - Single box, UV-mapped window pattern
  //   - ~50 triangles

  // LOD 2 (far): Colored box matching building color
  //   - 12 triangles

  // Style specifics:
  // artdeco: vertical lines, setback upper floors, neon sign slot
  // motel: long horizontal, balcony railings, pool visible
  // rowhouse: narrow, colorful, 2-3 floors, awning
  // warehouse: large flat, loading dock, corrugated metal
  // mansion: wide, columns, driveway, gated
}
```

### 5. `src/world/ChunkStreamer.ts`

```typescript
export class ChunkStreamer {
  private loadedChunks = new Map<string, ChunkData>();
  private loadRadius = CHUNK_LOAD_RADIUS;   // 3
  private unloadRadius = CHUNK_UNLOAD_RADIUS; // 4

  update(playerPos: Vec3, renderer: IRendererService, lod: LODManager): void;

  // Algorithm:
  // 1. Calculate player chunk: cx = floor(pos.x / 128), cz = floor(pos.z / 128)
  // 2. For each chunk in loadRadius:
  //    - If not loaded: generate chunk content, add to scene, emit world:chunkLoaded
  // 3. For each loaded chunk beyond unloadRadius:
  //    - Remove from scene, dispose geometry, emit world:chunkUnloaded
  // 4. Fade-in new chunks: opacity 0→1 over 0.5s (prevent pop-in)

  private generateChunk(cx: number, cz: number): ChunkData;
  // Contains: buildings, roads, props, terrain, collision data for this chunk
}
```

### 6. `src/world/PropPlacer.ts`

```typescript
export class PropPlacer {
  placeProps(district: DistrictId, bounds: Rect, density: number): PropPlacement[];

  generatePropMesh(prop: PropPlacement, materials: MaterialLibrary): THREE.Object3D;
  generateInstancedProps(props: PropPlacement[], type: string): THREE.InstancedMesh;

  // Prop rules per district:
  // OCEAN_BEACH: palms (high), beach umbrellas, lifeguard tower, benches
  // DOWNTOWN: street lamps, neon signs, benches, trash cans, bus stops
  // LITTLE_HAVANA: fruit stands, murals (decals), cafe tables
  // VICE_PORT: shipping containers, cranes (large static), forklifts
  // STARFISH_ISLAND: palms (sparse), luxury benches, yacht (static mesh)

  // Instancing: all palms in a chunk = 1 InstancedMesh
  // All street lamps = 1 InstancedMesh (with Agent 2's lighting system)
}
```

### 7. `src/world/Terrain.ts`

```typescript
export class Terrain {
  generateGroundMesh(): THREE.Mesh;
  getHeightAt(x: number, z: number): number;

  // Ground: mostly flat Y=0
  // Beach (Ocean Beach, east): gentle slope 0→-0.5m over 30m as X increases toward ocean
  // Harbor (Vice Port): dock platforms at Y=2m over water
  // Starfish Island: slightly elevated Y=1m (bridges connect to mainland)
  // Bridges: 2 bridges connecting Starfish Island to Downtown
  //   - North bridge: arch, 8m wide, 2 lanes
  //   - South bridge: flat, 10m wide, 4 lanes
}
```

### 8. `src/world/BeachGenerator.ts`

```typescript
export class BeachGenerator {
  generateBeach(): THREE.Group;
  // Sandy strip along east coast (X > 800):
  // - Sand material (light tan)
  // - Gentle slope into water
  // - Pier extending 40m into ocean at Z=0
  // - Boardwalk parallel to beach
  // - Parking lot at player spawn (asphalt, painted lines)
}
```

### 9. `src/world/CollisionExporter.ts`

```typescript
export class CollisionExporter {
  exportChunk(chunkId: string, meshes: THREE.Object3D[]): CollisionChunkData;
  // Walk all static meshes in chunk
  // Extract vertex positions + indices
  // Return as Float32Array / Uint32Array for Agent 4's TrimeshBuilder
  // Simplify: only export buildings + terrain + roads (not props)
}
```

### 10. `src/world/MinimapData.ts`

```typescript
export class MinimapGenerator {
  generate(mapData: typeof MAP_DATA, roadNetwork: RoadNetwork): MinimapData;
  // 2D top-down projection:
  // - Roads as colored lines (highway=gray, boulevard=white, street=light gray)
  // - Districts as colored polygons (semi-transparent)
  // - Water boundary on east
  // - Landmarks as labeled dots
  // Output: data structure, NOT rendered (Agent 9 renders)
}
```

### 11. `src/world/WorldSystem.ts`

```typescript
export class WorldSystem implements System, IWorldService {
  name = 'world' as const;

  async init(ctx: GameContext): Promise<void> {
    const renderer = ctx.getSystem<RendererSystem>('renderer');
    // Or use mock if Agent 2 not merged
    this.roadNetwork = new RoadNetwork(MAP_DATA);
    this.chunkStreamer = new ChunkStreamer(MAP_DATA, this.roadNetwork, ...);
    this.minimapData = new MinimapGenerator().generate(MAP_DATA, this.roadNetwork);
    this.terrain = new Terrain();
    // Add terrain + beach to scene
    // Listen for player:move → update chunk streaming
  }

  update(dt: number): void {
    // Get player position from events or IPlayerService
    // Update chunk streamer
    // Check district change → emit world:playerDistrictChange
  }

  // IWorldService
  getRoadNetwork(): RoadNetworkData;
  getMinimapData(): MinimapData;
  getDistrictAt(pos: Vec3): DistrictId;
  getSpawnPoint(id: string): Vec3;
  getCollisionData(chunkId: string): CollisionChunkData;
}
```

---

## District Building Counts (Target)

| District | Buildings | Props | Roads |
|----------|-----------|-------|-------|
| Ocean Beach | 40 | 80 palms, 20 benches | 8 segments |
| Downtown | 60 | 40 lamps, 30 neon | 12 segments |
| Little Havana | 50 | 30 fruit stands, 20 murals | 10 segments |
| Vice Port | 20 | 40 containers, 5 cranes | 6 segments |
| Starfish Island | 15 | 10 palms, 5 yachts | 4 segments |
| **Total** | **~185** | **~300** | **~40 segments** |

---

## Mock Dependencies

```typescript
// src/world/__mocks__/MockRendererService.ts
// Returns a basic THREE.Scene for testing without Agent 2
// Uses basic MeshStandardMaterial instead of MaterialLibrary
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `IWorldService` (roads, minimap, districts, spawns) | 4, 5, 6, 7, 9, 10 |
| `CollisionChunkData` via events | 4 |
| `RoadNetworkData` paths | 7 (traffic) |
| `MinimapData` | 9 |
| Scene meshes via `IRendererService` | rendered by Agent 2 |
| `world:chunkLoaded/Unloaded` events | 4, 7 |
| `world:playerDistrictChange` events | 8 |

| You Consume | From |
|-------------|------|
| `IRendererService` (add meshes, get materials) | Agent 2 |
| `MaterialLibrary` material IDs | Agent 2 |
| `LODManager.register()` | Agent 2 |
| `player:move` event (position for streaming) | Agent 5 |

---

## Acceptance Criteria

- [ ] 5 distinct districts visible with unique building styles and colors
- [ ] Road network connects all districts with intersections and traffic lights
- [ ] Ocean/beach on east side with pier and parking lot
- [ ] Player spawn at Ocean Beach parking lot
- [ ] ~185 buildings generated with 3 LOD levels
- [ ] Palms, lamps, neon signs placed per district rules
- [ ] Chunks load/unload smoothly (fade-in, no pop-in)
- [ ] Collision data exported per chunk
- [ ] Minimap data generated with roads, districts, landmarks
- [ ] Bridges connect Starfish Island to mainland
- [ ] All spawn points from master plan exist and are reachable by road
- [ ] < 500 draw calls when standing in Downtown (with Agent 2 rendering)
- [ ] `npm run build` passes

---

## DO NOT

- Implement physics bodies (Agent 4) — only export collision data
- Build player or vehicle controllers
- Create NPCs or traffic
- Render the minimap (Agent 9)
- Edit any folder outside `src/world/` and `public/assets/world/`
