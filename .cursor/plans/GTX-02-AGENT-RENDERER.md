# Agent 2: Rendering Engine and Graphics Pipeline

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 2 |
| Branch | `agent-02-renderer` |
| Owns | `src/renderer/`, `public/assets/renderer/` |
| Merge order | Wave 1 (parallel with 3, 4 after Agent 1) |
| Wave | 1 |

---

## Central Context

GTX is a browser GTA Vice City game. Agent 1 provides the game loop and shared contracts. **You own all visuals.** Your job: make a blank scene look like Vice City at sunset with killer mood — pink sky, teal water, neon-ready post-processing — while staying under 500 draw calls.

You do NOT build the city (Agent 3), characters (Agent 5), or vehicles (Agent 6). You provide the **rendering pipeline** they plug meshes into.

---

## Your Mission

Build the complete Three.js rendering stack: scene management, lighting, sky, water, shadows, materials library, LOD, day/night cycle, and post-processing (bloom, color grade, vignette, grain, FXAA). Implement `IRendererService` so all agents add objects to your scene safely.

---

## File Checklist

```
src/renderer/
  index.ts
  createSystem.ts
  types.ts
  RendererSystem.ts
  SceneManager.ts
  CameraRig.ts
  LightingSystem.ts
  SkySystem.ts
  WaterSystem.ts
  PostProcessing.ts
  ShadowSystem.ts
  MaterialLibrary.ts
  LODManager.ts
  DayNightCycle.ts
  shaders/
    sky.vert
    sky.frag
    water.vert
    water.frag
    colorGrade.frag
  __mocks__/
    MockGameContext.ts
public/assets/renderer/
  textures/
    noise.png
    lut-vice-city.png
  models/
    test-building.glb
```

---

## Detailed Implementation Spec

### 1. `src/renderer/types.ts`

```typescript
export enum RenderLayer {
  WORLD = 0,
  VEHICLE = 1,
  CHARACTER = 2,
  EFFECT = 3,
  UI_3D = 4,
}

export interface DayNightState {
  hour: number;           // 0-24
  sunAngle: number;       // radians
  sunColor: THREE.Color;
  ambientIntensity: number;
  isNight: boolean;
  bloomStrength: number;
  skyColors: { top: string; bottom: string; horizon: string };
}

export interface RendererConfig {
  antialias: boolean;
  shadowMapSize: number;
  pixelRatioMax: number;
  postProcessing: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
}
```

### 2. `src/renderer/RendererSystem.ts`
Main system implementing `System` + `IRendererService`.

```typescript
export class RendererSystem implements System, IRendererService {
  name = 'renderer' as const;

  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private cameraRig: CameraRig;
  private lighting: LightingSystem;
  private sky: SkySystem;
  private water: WaterSystem;
  private postProcessing: PostProcessing;
  private shadows: ShadowSystem;
  private materials: MaterialLibrary;
  private lod: LODManager;
  private dayNight: DayNightCycle;

  async init(ctx: GameContext): Promise<void> {
    // 1. Create WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: ctx.canvas,
      antialias: false,  // FXAA in post instead
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Init subsystems
    // 3. Build test scene: sky + water + 1 test building
    // 4. Listen for window resize
    // 5. Listen for game:pause → stop rendering
  }

  update(dt: number): void {
    this.dayNight.update(dt);
    this.sky.update(this.dayNight.getState());
    this.lighting.update(this.dayNight.getState());
    this.water.update(dt, this.dayNight.getState());
    this.lod.update(this.cameraRig.getCamera().position);
    this.postProcessing.render(this.sceneManager.scene, this.cameraRig.getCamera());
    // Emit world:timeChange when hour changes
  }

  // IRendererService implementation
  getScene(): THREE.Scene;
  getActiveCamera(): THREE.Camera;
  getRenderer(): THREE.WebGLRenderer;
  addToScene(object: THREE.Object3D, layer?: RenderLayer): void;
  removeFromScene(object: THREE.Object3D): void;
  getMaterial(id: string): THREE.Material;
  getDayNightState(): DayNightState;
  getStats(): RenderStats;
}
```

### 3. `src/renderer/SceneManager.ts`

```typescript
export class SceneManager {
  readonly scene: THREE.Scene;
  private layers = new Map<RenderLayer, THREE.Group>();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xFF6B9D, 0.0008); // Vice City pink fog
    for (const layer of Object.values(RenderLayer)) {
      const group = new THREE.Group();
      group.name = `layer_${layer}`;
      this.layers.set(layer as RenderLayer, group);
      this.scene.add(group);
    }
  }

  addToLayer(object: THREE.Object3D, layer: RenderLayer): void;
  removeFromLayer(object: THREE.Object3D, layer: RenderLayer): void;
  getLayer(layer: RenderLayer): THREE.Group;
}
```

### 4. `src/renderer/CameraRig.ts`
Base perspective camera. Agent 5 extends/wraps this for third-person.

```typescript
export class CameraRig {
  private camera: THREE.PerspectiveCamera;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(0, 50, 100); // overview for test scene
  }

  getCamera(): THREE.PerspectiveCamera;
  setAspect(width: number, height: number): void;
  setPosition(pos: Vec3): void;
  lookAt(target: Vec3): void;
}
```

### 5. `src/renderer/LightingSystem.ts`

```typescript
export class LightingSystem {
  private sun: THREE.DirectionalLight;
  private moon: THREE.DirectionalLight;
  private hemisphere: THREE.HemisphereLight;
  private streetLamps: THREE.InstancedMesh | null = null;

  init(scene: THREE.Scene): void;
  update(state: DayNightState): void;

  // Sun: casts shadows, color/intensity from DayNightState
  // Moon: opposite sun, low intensity, blue tint (visible at night)
  // Hemisphere: sky color → ground color gradient
  // Street lamps: InstancedMesh point lights, emissive at night only
  //   - Placeholder: 20 instances in a grid for test
}
```

Sun shadow config:
- `shadow.mapSize`: 1024 × 1024
- `shadow.camera.near`: 1
- `shadow.camera.far`: 500
- `shadow.camera.left/right/top/bottom`: ±150
- `shadow.bias`: -0.001

### 6. `src/renderer/SkySystem.ts`
Custom shader sky dome.

**Vertex shader (`shaders/sky.vert`):**
- Pass world position to fragment

**Fragment shader (`shaders/sky.frag`):**
```glsl
uniform vec3 topColor;      // purple at night, blue at day
uniform vec3 bottomColor;   // pink/orange at horizon
uniform vec3 horizonColor;  // bright orange at sunset
uniform float sunAngle;
uniform float dayMix;       // 0=night, 1=day

// Gradient based on Y position
// Sun disc: bright circle at sunAngle direction
// Sunset: blend topColor→horizonColor→bottomColor
// Stars at night: simple noise-based white dots
```

```typescript
export class SkySystem {
  private mesh: THREE.Mesh; // Sphere radius 900, BackSide

  constructor(scene: THREE.Scene);
  update(state: DayNightState): void;
  // Update uniforms from DayNightState.skyColors
}
```

### 7. `src/renderer/WaterSystem.ts`
Ocean plane on east side of map.

```typescript
export class WaterSystem {
  private mesh: THREE.Mesh; // Plane 2000×2000 at X=1000 (east edge), Y=0

  constructor(scene: THREE.Scene);
  update(dt: number, state: DayNightState): void;

  // Shader uniforms:
  // - time (wave animation)
  // - sunDirection (for specular)
  // - waterColor (deep blue day, dark blue night)
  // - reflectivity (higher at sunset)
  // Simple sine wave vertex displacement
  // Fragment: fresnel + specular highlight
}
```

### 8. `src/renderer/PostProcessing.ts`

```typescript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { RenderPass } from 'three/addons/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass';

export class PostProcessing {
  private composer: EffectComposer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera);

  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setBloomStrength(strength: number): void;
  setQuality(quality: 'low' | 'medium' | 'high'): void;

  // Pass chain:
  // 1. RenderPass
  // 2. UnrealBloomPass (threshold: 0.8, strength: dynamic from dayNight)
  // 3. ShaderPass (colorGrade.frag) — LUT texture lookup
  // 4. ShaderPass (vignette) — radial darkening, strength 0.3
  // 5. ShaderPass (filmGrain) — noise overlay, strength 0.05
  // 6. ShaderPass (FXAA) — anti-aliasing
}
```

**Color grade shader:** Sample `lut-vice-city.png` (16×16×16 LUT). Teal shadows, warm highlights.

### 9. `src/renderer/ShadowSystem.ts`

```typescript
export class ShadowSystem {
  setupShadows(sun: THREE.DirectionalLight): void;
  updateCascades(cameraPos: Vec3): void;
  // 2 cascades: near (0-50m, 1024px), far (50-200m, 512px)
  // Simplified: single shadow map for v1, upgrade later
}
```

### 10. `src/renderer/MaterialLibrary.ts`
Pre-built materials other agents request by ID.

```typescript
export class MaterialLibrary {
  private materials = new Map<string, THREE.Material>();

  init(): void;
  get(id: string): THREE.Material;

  // Material IDs (create all):
  // 'building-facade'    — MeshStandardMaterial, vertex colors, roughness 0.8
  // 'building-window'    — MeshStandardMaterial, emissive white, emissiveIntensity 0 (night toggle)
  // 'road-asphalt'       — MeshStandardMaterial, dark gray, roughness 0.9
  // 'road-marking'       — MeshBasicMaterial, white
  // 'sidewalk-concrete'  — MeshStandardMaterial, light gray
  // 'neon-pink'          — MeshStandardMaterial, emissive #FF1493, emissiveIntensity 2.0
  // 'neon-blue'          — MeshStandardMaterial, emissive #00BFFF, emissiveIntensity 2.0
  // 'palm-trunk'         — MeshStandardMaterial, brown
  // 'palm-leaves'        — MeshStandardMaterial, green, double-sided
  // 'water'              — (handled by WaterSystem shader)
  // 'vehicle-body'       — MeshStandardMaterial, metallic 0.6, roughness 0.3
  // 'vehicle-glass'      — MeshPhysicalMaterial, transparent, roughness 0.1
  // 'character-skin'     — MeshStandardMaterial, flesh tone
  // 'character-clothes'  — MeshStandardMaterial, configurable color
}
```

**Night window glow:** Listen for `world:timeChange`. When `isNight`, set `building-window` emissiveIntensity to 0.8. Day: 0.0.

### 11. `src/renderer/LODManager.ts`

```typescript
export interface LODEntry {
  object: THREE.Object3D;
  lod0: THREE.Object3D;  // full detail, < 100m
  lod1: THREE.Object3D;  // simplified, < 300m
  lod2: THREE.Object3D;  // box proxy, < 600m
  // > 800m: hidden
}

export class LODManager {
  private entries: LODEntry[] = [];

  register(entry: LODEntry): void;
  unregister(object: THREE.Object3D): void;
  update(cameraPos: Vec3): void;
  // Swap visible LOD based on distance
  // Use distance3 from shared/math
}
```

### 12. `src/renderer/DayNightCycle.ts`

```typescript
export class DayNightCycle {
  private hour = 18;  // start at sunset (Vice City vibe)
  private speed = 1;  // 1 = real-time DAY_LENGTH_MINUTES

  update(dt: number): void;
  getState(): DayNightState;
  setHour(hour: number): void;
  setSpeed(speed: number): void;

  // Interpolate all values from master plan time presets:
  // hour 6 → dawn preset
  // hour 12 → day preset
  // hour 18 → sunset preset (DEFAULT START)
  // hour 22 → night preset
  // hour 2 → deep night preset
  // Smooth lerp between adjacent presets
  // Emit world:timeChange when hour integer changes
}
```

### 13. `src/renderer/createSystem.ts`

```typescript
export function createRendererSystem(ctx: GameContext): System {
  const system = new RendererSystem();
  // Register IRendererService on ctx for other agents
  return system;
}
```

---

## Test Scene (Build This for Acceptance)

Before other agents merge, your test scene must look Vice City:

1. Sky dome with sunset gradient (pink/orange/purple)
2. Ocean plane on east with wave animation
3. One test art deco building (use `test-building.glb` or procedural box with `building-facade` material)
4. Neon sign on building (`neon-pink` material, bloom visible)
5. 5 instanced street lamps with point lights
6. Fog matching sky color
7. Post-processing: bloom + color grade + vignette active
8. Day/night cycle running (1 full cycle = 24 real minutes)
9. F3 dev overlay shows draw calls < 50 for test scene

---

## Mock Dependencies

Copy `src/shared/` from Agent 1 branch (or stub locally):

```typescript
// src/renderer/__mocks__/MockGameContext.ts
export function createMockContext(): GameContext {
  const canvas = document.createElement('canvas');
  return {
    canvas,
    events: new EventBus(),
    registry: new SystemRegistry(),
    assets: new AssetLoader(),
    getSystem: () => { throw new Error('not available in mock'); },
  };
}
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| `IRendererService` (scene, camera, materials) | 3, 5, 6, 7 |
| `MaterialLibrary` materials by ID | 3, 5, 6, 7 |
| `LODManager.register()` | 3 |
| `DayNightState` via events | 3, 8 |
| `RenderStats` via dev overlay | 1 |
| `CameraRig` (base camera) | 5 |

| You Consume | From |
|-------------|------|
| `GameContext`, `System`, `EventBus` | Agent 1 shared |
| `Vec3`, `constants` | Agent 1 shared |

---

## Performance Rules

- Pixel ratio clamped to 2 max
- Shadow map: 1024px (not 2048)
- Post-processing: can disable on `quality: 'low'`
- InstancedMesh for anything repeated > 5 times
- Material sorting: group by material to reduce draw calls
- Frustum culling: enabled (Three.js default)
- Target: test scene < 50 draw calls, full city < 500

---

## Acceptance Criteria

- [ ] Sunset sky with pink/orange/purple gradient renders correctly
- [ ] Ocean with wave animation on east side
- [ ] Post-processing bloom glows on neon emissive materials at night
- [ ] Color grading gives teal-shadow/warm-highlight Vice City mood
- [ ] Day/night cycle transitions smoothly through all 5 presets
- [ ] MaterialLibrary provides all 14 material IDs
- [ ] LODManager swaps 3 levels based on camera distance
- [ ] IRendererService allows adding/removing objects from scene
- [ ] `world:timeChange` event fires on hour change
- [ ] 60fps on test scene, < 50 draw calls
- [ ] `npm run build` passes
- [ ] No files outside `src/renderer/` and `public/assets/renderer/`

---

## DO NOT

- Build city geometry, roads, or buildings (Agent 3)
- Implement player camera or controls (Agent 5)
- Create vehicle models (Agent 6)
- Add UI elements (Agent 9)
- Edit `src/shared/`, `src/main.ts`, or any other agent's folder
