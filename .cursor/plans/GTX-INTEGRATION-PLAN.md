# GTX Integration Plan — Single Branch `integration`

> **Branch:** `integration` (one branch only — no `agent-XX-*`, no `integration/final`)  
> **Base:** `main` @ all 10 agent PRs merged (#1–#9)  
> **Goal:** Wire all modules into a playable Vice City browser game  
> **Owner:** Integration agent (extends Agent 1 `src/core/` + `src/main.ts`)

---

## 0. Executive Summary

All 10 agents delivered their modules and merged to `main` with **zero file conflicts**. Every folder exists under `src/`. However, **`Game.ts` still registers stub systems** for agents 2–10. The game boots but does not render the city, spawn the player, or run gameplay.

This plan covers **one integration branch** (`integration`) that completes wiring, fixes cross-system issues, smoke-tests, and merges back to `main`.

| Item | Status |
|------|--------|
| All 10 agent modules on `main` | Done |
| Branches renamed (`renderer`, `world`, etc.) | Done |
| Systems wired in `Game.ts` | **Done** |
| Game playable end-to-end | **Done** |

**Proof stubs are still active:**
- `src/core/Game.ts` lines 54–56 register `createStubSystem()` for all 9 modules
- `npm run build` bundles ~25 modules (~278KB) — no Three.js pipeline in bundle
- Console shows `[GTX:renderer] stub initialized` instead of real renderer

---

## 1. Branch Strategy

```bash
git checkout main && git pull
git checkout integration   # already exists, tracks integration work
# all integration commits go here — do NOT create new branches
git push -u origin integration
# when complete: merge integration → main (one PR)
```

**Rules:**
- All integration work happens on `integration` only
- Touch only files required for wiring (mostly `src/core/Game.ts`, shared shims, cross-system fixes)
- Do **not** rewrite agent module internals unless fixing integration bugs
- Target **15–25 commits** on `integration` branch (logical, small commits)
- Merge to `main` via single PR when smoke tests pass

---

## 2. Phase 1 — Wire All Systems in `Game.ts` (P0 — CRITICAL)

### Problem
`Game.ts` registers stubs. Real `createXSystem()` factories exist in every module but are never called.

### File to change
- `src/core/Game.ts` — **primary change**
- Optionally `src/core/stubs.ts` — keep for dev/debug flag, remove from default boot path

### Registration order (init dependencies)

```typescript
import { createRendererSystem } from '../renderer';
import { createWorldSystem } from '../world';
import { createPhysicsSystem } from '../physics';
import { createPlayerSystem } from '../player';
import { createVehicleSystem } from '../vehicles';
import { createAISystem } from '../ai';
import { createAudioSystem } from '../audio';
import { createUISystem } from '../ui';
import { createGameplaySystem } from '../gameplay';

// Inside init(), AFTER createCoreSystem():
registry.register(createRendererSystem(ctx));   // 2 — scene, camera, post-FX
registry.register(createWorldSystem(ctx));        // 3 — needs IRendererService
registry.register(createPhysicsSystem(ctx));    // 4 — listens world:chunkLoaded
registry.register(createPlayerSystem(ctx));     // 5 — needs physics + renderer + world spawn
registry.register(createVehicleSystem(ctx));    // 6 — needs physics + player events
registry.register(createAISystem(ctx));         // 7 — needs world roads + vehicles + player pos
registry.register(createAudioSystem(ctx));      // 8 — needs player position + events
registry.register(createUISystem(ctx));         // 9 — needs player state + world minimap
registry.register(createGameplaySystem(ctx));   // 10 — needs player + physics raycast

// REMOVE this block:
// for (const name of STUB_SYSTEM_NAMES) {
//   registry.register(createStubSystem(name));
// }
```

### Init sequence (unchanged)
1. Build `GameContext` (canvas, events, registry, assets, entities)
2. Register all systems (order above)
3. `await system.init(ctx)` for each — **sequential, not parallel** (systems depend on prior inits)
4. Emit `game:ready`, start `GameLoop`

### System update order (already defined in `SystemRegistry`)
Fixed: `physics → player → vehicles → ai → gameplay`  
Variable: `world → player → vehicles → ai → gameplay → audio → ui → renderer`

### Expected results after Phase 1
| Metric | Before | After |
|--------|--------|-------|
| Bundle modules | ~25 | ~200+ |
| Bundle size | ~278KB | ~1–3MB |
| Console on boot | stub messages | real system init logs |
| Visual | blank/dark canvas | sunset sky + ocean + city |
| F3 draw calls | 0 | 50–500 |

### Commits (Phase 1)
1. `Wire renderer system in Game bootstrap`
2. `Wire world and physics systems in Game bootstrap`
3. `Wire player and vehicle systems in Game bootstrap`
4. `Wire AI audio UI and gameplay systems in Game bootstrap`
5. `Remove default stub system registration from Game`

### Acceptance criteria
- [x] `npm run build` passes
- [x] `npm run dev` shows Vice City sunset + ocean (not blank)
- [x] No `[GTX:renderer] stub initialized` in console
- [x] F3 overlay shows draw calls > 0

---

## 3. Phase 2 — Consolidate ShaderPass Type Shims (P1)

### Problem
Three agents independently patched the same TypeScript error:

| File | Location |
|------|----------|
| `src/player/shader-pass-augment.d.ts` | Agent 5 |
| `src/vehicles/shader-pass-augment.d.ts` | Agent 6 |
| `src/ai/three-shader-pass.d.ts` | Agent 7 |

Renderer passes (`ColorGradePass.ts`, `VignetteGrainPasses.ts`) set `.name` on `ShaderPass` instances; Three.js types don't include `name` on ShaderPass.

### Solution
1. Create **one** shared shim: `src/shared/three-shader-pass.d.ts`
2. Delete the 3 agent-local copies
3. Optionally fix renderer passes to use a typed wrapper instead of augmenting global module (cleaner long-term)

### Shared shim content
```typescript
declare module 'three/addons/postprocessing/ShaderPass.js' {
  interface ShaderPass {
    name?: string;
  }
}
```

### Commits (Phase 2)
1. `Add shared ShaderPass type augmentation`
2. `Remove duplicate shader-pass shims from player vehicles and ai`

### Acceptance criteria
- [x] `npm run build` passes with zero TS errors
- [x] Only one shader-pass d.ts in codebase

---

## 4. Phase 3 — Remove Runtime Mock Fallbacks (P2)

### Problem
Systems were built against stubs and still fall back to mocks at runtime when they detect missing capabilities.

| System | File | Mock used when |
|--------|------|----------------|
| World | `WorldSystem.ts` | `getSystem('renderer')` lacks `getScene` |
| Player | `physics-bridge.ts` | physics system missing methods |
| Vehicles | `VehicleSystem.ts` | `MockPhysicsService`, `MockPlayerService` |
| AI | `AISystem.ts` | `resolveWorld/Physics/Renderer/Vehicle` → mocks |
| Gameplay | `service-resolver.ts` | `resolvePhysics/Player` → mocks |
| UI | `UISystem.ts` | `MockPlayerService` fallback |

### Plan
After Phase 1 wiring, audit each resolver:

1. **WorldSystem** — remove `MockRendererService` runtime branch; assume real renderer always present. Keep mock file in `__mocks__/` for tests only.

2. **PlayerSystem** — `physics-bridge.ts` should call real `IPhysicsService` directly. Remove optional stub path.

3. **VehicleSystem** — use `ctx.getSystem('physics')` and `ctx.getSystem('player')` directly. Delete runtime mock imports.

4. **AISystem** — replace `resolveWorld()` etc. with direct `ctx.getSystem()` casts. Mocks stay in `__mocks__/` only.

5. **GameplaySystem** — `service-resolver.ts` should use real systems; remove `createMockPlayerService()` fallback in `init()`.

6. **UISystem** — read player state from `ctx.getSystem('player')` as `IPlayerService`; remove mock fallback.

### Commits (Phase 3)
1. `Remove runtime mock fallback from WorldSystem`
2. `Use real physics service in PlayerSystem`
3. `Use real services in VehicleSystem and AISystem`
4. `Use real player and physics in GameplaySystem and UISystem`

### Acceptance criteria
- [x] No `import` from `__mocks__/` in non-test production code
- [x] Grep `__mocks__` in `src/` returns only `__tests__` or `__mocks__/` folders themselves
- [x] Player walks on physics ground (not falling through)
- [x] World chunks load real geometry (not empty mock scene)

---

## 5. Phase 4 — Cross-System Event Audit (P2)

### Critical event chains to verify manually

```
BOOT
  game:init → all systems init
  game:ready → music starts, loading screen hides

PLAYER
  player:spawn { position } →
    world: starts chunk streaming at spawn
    ai: sets playerPos for spawn manager

  player:move { position, velocity, isGrounded } →
    world: ChunkStreamer.update(playerPos)
    world: world:playerDistrictChange → audio: AmbientManager crossfade
    audio: FootstepController (if grounded + moving)

VEHICLE
  player:enterVehicle { playerId, vehicleId, seat } →
    player: hide model, disable physics
    vehicles: VehicleCamera.activate()
    audio: music fade out, radio activate
    ui: speedometer show, radio UI show

  vehicle:enginePitch { rpm, speed } →
    audio: engine sound pitch update

  vehicle:speedChange { speedKmh } →
    ui: speedometer update

COMBAT
  combat:shoot { origin, direction, weaponId } →
    physics: raycast hit detection
    audio: spatial gunshot SFX
    ai: ReactionSystem flee nearby NPCs

  combat:hit { targetId, damage } →
    ai: npc.takeDamage()
    wanted: CrimeDetector.addStar()

WANTED
  wanted:levelChange { level } →
    ai: PoliceAI.onWantedLevelChange()
    ui: WantedDisplay flash stars
    audio: siren SFX (level >= 2)

WORLD
  world:chunkLoaded { chunkId } →
    physics: TrimeshBuilder.buildFromChunkData()

MISSION
  mission:start { title, objective } →
    ui: MissionText show
    gameplay: 3D cone marker in scene (via renderer)

  mission:complete { reward } →
    ui: "MISSION PASSED!" notification
    audio: mission pass SFX
    economy: add money
```

### Event audit checklist
| Event | Emitter | Expected listeners | Test |
|-------|---------|-------------------|------|
| `game:ready` | core | audio (music), ui (hide loading) | Music plays |
| `player:spawn` | player | world, ai | Chunks load at Ocean Beach |
| `player:move` | player | world, audio | District ambient changes |
| `player:enterVehicle` | vehicles | audio, ui, player | Radio + speedometer |
| `vehicle:enginePitch` | vehicles | audio | Engine sound |
| `wanted:levelChange` | gameplay | ai, ui | Police + stars |
| `combat:shoot` | gameplay | physics, audio, ai | Gunshot + flee |
| `world:chunkLoaded` | world | physics | Collision works |
| `mission:start` | gameplay | ui | Objective text shows |

### Commits (Phase 4)
1. `Fix broken event listeners found in audit` (as needed, one commit per fix)

---

## 6. Phase 5 — Camera Ownership (P1)

### Problem
Three systems may fight over the active camera each frame:

| System | Camera behavior |
|--------|----------------|
| Renderer `CameraRig` | Default overview (test scene position) |
| Player `ThirdPersonCamera` | Orbit follow on foot |
| Vehicle `VehicleCamera` | Chase cam behind car |

### Resolution plan
1. **Renderer owns the camera object** — creates `PerspectiveCamera`, exposes via `IRendererService.getActiveCamera()`
2. **Player system controls camera on foot** — `ThirdPersonCamera.update()` writes position/rotation to shared camera
3. **Vehicle system controls camera when driving** — `VehicleCamera.update()` takes over; player camera pauses
4. **On enterVehicle event** — vehicle camera activates, player camera deactivates
5. **On exitVehicle event** — reverse

### Files to audit
- `src/renderer/CameraRig.ts`
- `src/player/ThirdPersonCamera.ts`
- `src/player/PlayerSystem.ts`
- `src/vehicles/VehicleCamera.ts`
- `src/vehicles/VehicleSystem.ts`

### Acceptance criteria
- [x] On foot: smooth third-person follow, no jitter
- [x] In vehicle: camera switches to driving mode instantly
- [x] On exit: returns to third-person without snap
- [x] No double-update (only one system writes camera per frame)

### Commits (Phase 5)
1. `Define camera handoff between player and vehicle systems`

---

## 7. Phase 6 — Input Key Conflicts (P1)

### Conflicts identified

| Key | System A | System B | Resolution |
|-----|----------|----------|------------|
| **R** | Audio: radio cycle (`AudioSystem.ts:108`) | Gameplay: reload (`GameplaySystem.ts:122`) | **R = reload always**. Radio cycle moves to **Q** key. Update `LoadingScreen` tip. |
| **E** | Player: interact/enter | Vehicle: exit (when driving) | OK — context-dependent, same key is GTA-standard |
| **Space** | Player: jump | Vehicle: handbrake | OK — player disabled when in vehicle |
| **Tab** | UI: minimap toggle | — | OK |
| **Escape** | UI: pause menu | — | OK |
| **1/2/3** | Gameplay: weapon switch | — | OK |

### Implementation plan for R conflict
1. `src/audio/AudioSystem.ts` — change `KeyR` → `KeyQ` for radio cycle
2. `src/ui/LoadingScreen.ts` — update tip: "Press Q in a vehicle to change radio"
3. `src/gameplay/GameplaySystem.ts` — keep `KeyR` for reload (only when armed on foot)
4. Document final controls in this plan (section 12)

### Commits (Phase 6)
1. `Move radio cycle from R to Q to avoid reload conflict`
2. `Update loading screen control tips`

---

## 8. Phase 7 — Assets (P3 — Optional for v1)

### Current state
| Asset type | Status | Runtime fallback |
|------------|--------|------------------|
| Renderer textures (LUT, noise) | Real PNG files | — |
| UI icons | Real SVG files | — |
| Audio MP3s | `.gitkeep` placeholders | `ProceduralAudio` oscillators |
| Player glTF | `.gitkeep` | Procedural low-poly mesh |
| Vehicle glTFs | `.gitkeep` | Procedural box meshes |
| World props | `.gitkeep` | Procedural geometry |

### Plan
- **v1 integration:** procedural fallbacks are acceptable — game must be playable without real assets
- **v1.1 polish:** add royalty-free MP3s for music/SFX, simple glTF models
- No blocker for integration merge

---

## 9. Phase 8 — Performance Pass (P2)

### Targets (from master plan)
| Metric | Target |
|--------|--------|
| FPS | 60 (30 min on low-end) |
| Draw calls | < 500 |
| On-screen triangles | < 2M |
| Active pedestrians | ≤ 20 |
| Active traffic | ≤ 15 |

### Performance checklist
- [ ] F3 dev overlay reports FPS and draw calls
- [ ] Standing in Downtown: draw calls < 500
- [ ] Driving across map: chunk load/unload smooth, no stutter
- [ ] 20 peds + 15 traffic active without frame drops
- [ ] LOD swaps visible on buildings at distance (no pop-in)
- [ ] Post-processing can disable on low quality setting

### If performance fails
1. Reduce `CHUNK_LOAD_RADIUS` from 3 → 2
2. Lower shadow map to 512px
3. Disable film grain + vignette on low quality
4. Cap traffic at 10, peds at 15

### Commits (Phase 8)
1. `Tune chunk load radius and AI caps for 60fps target` (if needed)

---

## 10. Phase 9 — DevOverlay Enhancement (P2)

### Problem
DevOverlay currently only shows entity count. After integration, it should show real renderer stats.

### Plan
Wire `Game.ts` onTick to read from renderer:

```typescript
onTick: () => {
  const renderer = this.registry.get('renderer');
  const stats = renderer.getStats?.() ?? { drawCalls: 0, triangles: 0 };
  this.overlay.update({
    entities: this.entities.count(),
    drawCalls: stats.drawCalls,
    triangles: stats.triangles,
  });
}
```

Requires `RendererSystem.getStats()` to be callable (already planned in Agent 2).

### Commits
1. `Wire dev overlay to renderer stats`

---

## 11. Phase 10 — Merge to Main & Branch Cleanup (P0 final)

### Merge process
```bash
# On integration branch, all phases complete:
npm run build          # must pass
npm run dev            # manual smoke test (section 13)

git push origin integration
gh pr create --title "Integrate all GTX systems into playable game" --body "..."
# Review + merge integration → main
```

### After merge
| Branch | Action |
|--------|--------|
| `integration` | Delete after merge (or keep for reference) |
| `core` | Delete — stuck at Agent 1 only, behind main |
| `renderer`, `world`, etc. | Reset to main tip or delete — all merged |
| `main` | Single source of truth |

---

## 12. Final Control Scheme (after Phase 6)

| Input | On foot | In vehicle |
|-------|---------|------------|
| WASD | Move | Drive |
| Mouse | Camera orbit | — |
| Shift | Sprint | — |
| Space | Jump | Handbrake |
| E | Enter vehicle | Exit vehicle |
| F | Enter as passenger | — |
| Left click | Shoot | — |
| R | Reload | — |
| Q | — | Cycle radio |
| 1/2/3 | Weapon switch | — |
| Tab | Toggle minimap | Toggle minimap |
| Escape | Pause menu | Pause menu |
| F3 | Dev overlay | Dev overlay |

---

## 13. Smoke Test Checklist (run before merge to main)

Run `npm run dev`, click canvas for pointer lock.

| # | Test | Pass? |
|---|------|-------|
| 1 | Pink loading screen → hides on boot | |
| 2 | Vice City sunset sky + ocean visible (east) | |
| 3 | Buildings and roads render (not blank canvas) | |
| 4 | F3 shows FPS > 30, draw calls > 50 | |
| 5 | WASD walks, camera follows smoothly | |
| 6 | Player collides with buildings (no walking through walls) | |
| 7 | E near parked car → enters vehicle | |
| 8 | WASD drives car, speedometer shows km/h | |
| 9 | Q cycles radio stations in vehicle | |
| 10 | E exits vehicle, third-person camera returns | |
| 11 | Traffic drives on roads | |
| 12 | Pedestrians walk on sidewalks | |
| 13 | Left click shoots, gunshot sound plays | |
| 14 | NPCs react/flee when shot near them | |
| 15 | Wanted stars appear after crime | |
| 16 | Police chase at wanted level 2+ | |
| 17 | Mission 1 text appears after 3 seconds | |
| 18 | Drive to Downtown marker → "MISSION PASSED!" | |
| 19 | Escape opens pause menu, settings sliders work | |
| 20 | Save in pause menu → reload page → position restored | |

**Merge gate:** 18/20 tests pass minimum. Tests 10, 16, 20 are stretch goals.

---

## 14. Commit Plan Summary (integration branch)

Target: **18–25 commits** on `integration`

| Phase | Commits | Description |
|-------|---------|-------------|
| 1 | 5 | Wire all systems in Game.ts |
| 2 | 2 | Consolidate ShaderPass shims |
| 3 | 4 | Remove runtime mock fallbacks |
| 4 | 1–3 | Fix event audit issues |
| 5 | 1 | Camera handoff |
| 6 | 2 | Input key conflict fixes |
| 8 | 0–1 | Performance tuning (if needed) |
| 9 | 1 | DevOverlay renderer stats |
| 10 | 1 | Update integration plan status / PR prep |

---

## 15. Files Allowed to Touch (integration scope)

| File / folder | Why |
|---------------|-----|
| `src/core/Game.ts` | Wire real systems |
| `src/core/stubs.ts` | Keep but don't use in prod boot |
| `src/shared/three-shader-pass.d.ts` | New shared shim |
| `src/player/shader-pass-augment.d.ts` | Delete |
| `src/vehicles/shader-pass-augment.d.ts` | Delete |
| `src/ai/three-shader-pass.d.ts` | Delete |
| `src/audio/AudioSystem.ts` | R → Q radio key |
| `src/ui/LoadingScreen.ts` | Update control tip |
| `src/world/WorldSystem.ts` | Remove mock fallback |
| `src/player/physics-bridge.ts` | Simplify to real physics |
| `src/vehicles/VehicleSystem.ts` | Remove mock imports |
| `src/ai/AISystem.ts` | Remove mock resolvers |
| `src/gameplay/service-resolver.ts` | Remove mock fallbacks |
| `src/gameplay/GameplaySystem.ts` | Remove mock player fallback |
| `src/ui/UISystem.ts` | Remove mock player fallback |
| `.cursor/plans/GTX-INTEGRATION-PLAN.md` | This plan |

**Do NOT touch** agent module internals unless fixing a specific integration bug found in smoke tests.

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Init order crash (system A needs B not ready) | Medium | Boot failure | Sequential init, correct registration order |
| Camera fight between player/vehicle | High | Jittery cam | Phase 5 handoff |
| R key conflict breaks reload or radio | High | Bad UX | Phase 6 — Q for radio |
| Physics trimesh not loading from chunks | Medium | Fall through ground | Verify world:chunkLoaded → physics listener |
| Build fails after wiring (circular imports) | Low | Blocked | Import only `createXSystem` in Game.ts |
| Performance < 30fps in Downtown | Medium | Unplayable | Phase 8 tuning |
| Mock fallbacks silently used | Medium | Broken gameplay | Phase 3 audit + grep |

---

## 17. Definition of Done

Integration is **complete** when:

1. `integration` branch merges to `main` via PR
2. `npm run build` passes on `main`
3. `npm run dev` shows playable Vice City (sky, city, player, vehicles)
4. Smoke test: **18/20** checks pass
5. No stub systems registered in `Game.ts`
6. No runtime `__mocks__` imports in production code
7. Single ShaderPass type shim in `src/shared/`
8. Control scheme documented (section 12)

---

## 18. Prompt for Integration Agent

```
You are the GTX Integration Agent.

Branch: integration (ONLY this branch — do not create others)
Read: .cursor/plans/GTX-INTEGRATION-PLAN.md

Execute phases 1–10 in order. Commit after each logical step (18–25 commits).
Do not rewrite agent modules unless fixing a specific integration bug.

Start with Phase 1: wire createXSystem() in src/core/Game.ts.
Run npm run build after each phase.
Run smoke test checklist before opening PR to main.
```
