# Agent 9: UI, HUD, and Menus

> **Read first:** [GTX-00-MASTER-PLAN.md](./GTX-00-MASTER-PLAN.md)

| Field | Value |
|-------|-------|
| Agent ID | 9 |
| Branch | `agent-09-ui` |
| Owns | `src/ui/`, `public/assets/ui/` |
| Merge order | Wave 3 (after player spawn works) |
| Wave | 3 |

---

## Central Context

GTX is a browser GTA Vice City game. Wave 2 merged — player walks, drives, city is alive. **You build all UI** — HUD, minimap, wanted stars, speedometer, menus, notifications. Vice City aesthetic: pink borders, teal accents, retro 80s font, scanline overlay.

All UI is HTML/CSS overlay on top of the Three.js canvas (not Three.js UI).

---

## Your Mission

GTA-authentic HUD with Vice City styling, 2D canvas minimap, pause/settings menu, mission text, interaction prompts, and notification toasts.

---

## File Checklist

```
src/ui/
  index.ts
  createSystem.ts
  types.ts
  UISystem.ts
  HUD.ts
  Minimap.ts
  Speedometer.ts
  WantedDisplay.ts
  InteractionPrompt.ts
  PauseMenu.ts
  SettingsPanel.ts
  MissionText.ts
  NotificationSystem.ts
  RadioUI.ts
  LoadingScreen.ts
  UITheme.ts
  styles/
    hud.css
    menu.css
    minimap.css
    notifications.css
  __mocks__/
    MockPlayerService.ts
public/assets/ui/
  fonts/
    (use Google Fonts: 'Orbitron' for HUD, 'Press Start 2P' for titles)
  icons/
    star.svg
    health.svg
    armor.svg
    weapon-pistol.svg
    weapon-fists.svg
```

---

## Detailed Implementation Spec

### 1. `src/ui/types.ts`

```typescript
export interface HUDState {
  health: number;
  armor: number;
  money: number;
  weaponId: string | null;
  weaponAmmo: number;
  wantedLevel: number;
  isInVehicle: boolean;
  vehicleSpeed: number;
  radioStation: string | null;
  missionObjective: string | null;
  interactionPrompt: string | null;
}

export interface Notification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  createdAt: number;
}

export interface UISettings {
  showMinimap: boolean;
  showHUD: boolean;
  hudScale: number;  // 0.8 - 1.2
}
```

### 2. `src/ui/UITheme.ts`

```typescript
export const VICE_CITY_THEME = {
  colors: {
    primary: '#FF6B9D',      // Vice pink
    secondary: '#2DD4BF',    // Vice teal
    accent: '#FF8C42',       // Vice orange
    background: 'rgba(10, 10, 15, 0.85)',
    text: '#FFFFFF',
    textDim: 'rgba(255, 255, 255, 0.6)',
    health: '#FF4444',
    armor: '#4488FF',
    money: '#44FF44',
    danger: '#FF0000',
  },
  fonts: {
    hud: "'Orbitron', monospace",
    title: "'Press Start 2P', monospace",
    body: "'Inter', sans-serif",
  },
  borders: {
    hud: '2px solid #FF6B9D',
    glow: '0 0 10px rgba(255, 107, 157, 0.5)',
  },
  sizes: {
    minimap: 150,
    hudPadding: 16,
    barHeight: 12,
    barWidth: 150,
  },
};
```

### 3. `src/ui/HUD.ts`

```typescript
export class HUD {
  private container: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private armorBar: HTMLDivElement;
  private moneyDisplay: HTMLSpanElement;
  private weaponDisplay: HTMLDivElement;

  constructor(parent: HTMLElement);
  // Create DOM structure:
  //
  // <div id="hud" class="hud-container">
  //   <div class="hud-bottom-left">
  //     <div class="health-bar"><div class="fill" style="width: 100%"></div></div>
  //     <div class="armor-bar"><div class="fill" style="width: 0%"></div></div>
  //     <div class="money">$0</div>
  //     <div class="weapon-icon"></div>
  //   </div>
  // </div>

  update(state: HUDState): void;
  // health bar width = state.health%
  // armor bar width = state.armor% (hidden if 0)
  // money: format as $XX,XXX
  // weapon: show icon based on weaponId

  show(): void;
  hide(): void;
  setScale(scale: number): void;
}
```

**CSS (hud.css):**
```css
.hud-container {
  position: fixed; bottom: 0; left: 0; right: 0;
  pointer-events: none; z-index: 100;
  padding: 16px;
}
.health-bar, .armor-bar {
  width: 150px; height: 12px;
  background: rgba(0,0,0,0.6);
  border: 2px solid #FF6B9D;
  border-radius: 2px;
  margin-bottom: 4px;
}
.health-bar .fill { background: linear-gradient(90deg, #FF4444, #FF6B9D); height: 100%; transition: width 0.3s; }
.armor-bar .fill { background: linear-gradient(90deg, #4488FF, #2DD4BF); height: 100%; }
.money { font-family: 'Orbitron'; color: #44FF44; font-size: 20px; text-shadow: 0 0 8px #44FF44; }
```

### 4. `src/ui/Minimap.ts`

```typescript
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 150;
  private zoom = 0.15;  // world meters per pixel
  private visible = true;

  constructor(parent: HTMLElement);
  // Position: fixed, top-right, 16px margin
  // Canvas 150×150, border: 2px solid #FF6B9D
  // Circular clip or rounded square

  render(
    playerPos: Vec3,
    playerHeading: number,
    minimapData: MinimapData,
    blips: Array<{ pos: Vec2; color: string; size: number; type: string }>,
  ): void;
  // 1. Clear canvas
  // 2. Draw district polygons (semi-transparent fills)
  // 3. Draw roads (lines, color by type)
  // 4. Draw water (blue area on east)
  // 5. Draw blips (mission markers, vehicles)
  // 6. Draw player arrow (center, rotated by heading)
  // 7. Draw north indicator (N arrow, top)

  toggle(): void;  // Tab key
  show(): void;
  hide(): void;
}
```

**Blip types:**
| Type | Color | Shape |
|------|-------|-------|
| Player | White | Arrow |
| Mission objective | Yellow | Square |
| Vehicle | Light blue | Dot |
| Police | Red | Dot (flashing) |
| Pickup | Green | Diamond |

### 5. `src/ui/Speedometer.ts`

```typescript
export class Speedometer {
  private container: HTMLDivElement;
  private speedText: HTMLSpanElement;
  private visible = false;

  constructor(parent: HTMLElement);
  // Position: bottom-right
  // Style: large Orbitron font, teal color
  // "87 km/h" display

  update(speedKmh: number): void;
  show(): void;   // on player:enterVehicle
  hide(): void;  // on player:exitVehicle
}
```

### 6. `src/ui/WantedDisplay.ts`

```typescript
export class WantedDisplay {
  private container: HTMLDivElement;
  private stars: HTMLDivElement[] = [];
  private currentLevel = 0;
  private flashTimer = 0;

  constructor(parent: HTMLElement);
  // Position: top-center
  // 5 star icons (SVG or Unicode ★)
  // Inactive: gray outline
  // Active: gold filled
  // Flashing: when level > 0, pulse opacity 0.5-1.0 every 0.5s

  update(level: number): void;
  // Show/hide stars based on level
  // Start/stop flash animation
}
```

### 7. `src/ui/InteractionPrompt.ts`

```typescript
export class InteractionPrompt {
  private container: HTMLDivElement;
  private text: HTMLSpanElement;

  constructor(parent: HTMLElement);
  // Position: bottom-center, above HUD
  // Style: white text, pink border, fade in/out
  // "Press E to enter Cheetah"

  show(text: string): void;
  hide(): void;

  // Listen for player:interactPrompt events
}
```

### 8. `src/ui/MissionText.ts`

```typescript
export class MissionText {
  private container: HTMLDivElement;
  private title: HTMLDivElement;
  private objective: HTMLDivElement;

  constructor(parent: HTMLElement);
  // Position: top-left, below wanted stars
  // Style: mission title in Press Start 2P, objective in Orbitron

  showMission(title: string, objective: string): void;
  updateObjective(objective: string): void;
  hide(): void;

  // Listen for mission:start, mission:update, mission:complete, mission:fail
}
```

### 9. `src/ui/NotificationSystem.ts`

```typescript
export class NotificationSystem {
  private container: HTMLDivElement;
  private notifications: Notification[] = [];

  constructor(parent: HTMLElement);
  // Position: top-right, below minimap
  // Stack notifications vertically

  show(text: string, type: Notification['type'], duration: number): void;
  // Slide in from right, fade out after duration
  // "MISSION PASSED!" in gold (success)
  // "WASTED" in red (error)
  // "Radio: V-Rock" in teal (info)

  update(dt: number): void;
  // Remove expired notifications

  // Listen for ui:notification events
  // Listen for mission:complete → "MISSION PASSED!"
  // Listen for mission:fail → "MISSION FAILED!"
  // Listen for player:death → "WASTED"
}
```

### 10. `src/ui/RadioUI.ts`

```typescript
export class RadioUI {
  private container: HTMLDivElement;
  private visible = false;

  constructor(parent: HTMLElement);
  // Position: bottom-center (when in vehicle)
  // Small display: station name + tagline
  // "♫ Wave 103 — The sound of today!"
  // Color matches station color
  // Auto-hide after 3 seconds, show on station change

  show(station: RadioStation): void;
  hide(): void;
}
```

### 11. `src/ui/PauseMenu.ts`

```typescript
export class PauseMenu {
  private overlay: HTMLDivElement;
  private visible = false;

  constructor(parent: HTMLElement, events: EventBus);
  // Full-screen overlay, dark background (0.8 opacity)
  // Centered menu:
  //   "PAUSED" title (Press Start 2P)
  //   [Resume] [Settings] [Save Game] [Quit]
  // Buttons: pink border, teal hover glow

  show(): void;   // emit game:pause
  hide(): void;  // emit game:resume

  // Escape key → toggle
  // Resume → hide
  // Settings → show SettingsPanel
  // Save Game → emit save request (Agent 10)
  // Quit → reload page (or confirm dialog)
}
```

### 12. `src/ui/SettingsPanel.ts`

```typescript
export class SettingsPanel {
  private panel: HTMLDivElement;

  constructor(parent: HTMLElement, events: EventBus);
  // Sliders:
  //   Master Volume (0-100%)
  //   Music Volume
  //   SFX Volume
  //   Ambient Volume
  //   Mouse Sensitivity (0.5-2.0)
  //   HUD Scale (0.8-1.2)
  // Toggle:
  //   Show Minimap
  //   Show HUD
  // Graphics Quality: Low / Medium / High (dropdown)
  //
  // On change → emit audio:volumeChange or store in localStorage
  // Save settings to localStorage key: 'gtx-settings'

  show(): void;
  hide(): void;
  loadSettings(): UISettings;
  saveSettings(settings: UISettings): void;
}
```

### 13. `src/ui/LoadingScreen.ts`

```typescript
export class LoadingScreen {
  private overlay: HTMLDivElement;
  private bar: HTMLDivElement;
  private tip: HTMLParagraphElement;

  constructor();
  // Uses existing #loading-screen from index.html
  // Vice City gradient background
  // "GTX" title, "Loading Vice City..." subtitle
  // Progress bar (teal fill)
  // Random loading tip at bottom

  updateProgress(percent: number): void;
  hide(): void;  // on game:ready

  private tips = [
    "Tip: Press E near a vehicle to enter it",
    "Tip: Hold Shift to sprint",
    "Tip: Press R in a vehicle to change radio station",
    "Tip: Avoid police attention for a peaceful tour",
    "Tip: Explore Ocean Beach at sunset for the best views",
  ];
}
```

### 14. `src/ui/UISystem.ts`

```typescript
export class UISystem implements System {
  name = 'ui' as const;

  private hud: HUD;
  private minimap: Minimap;
  private speedometer: Speedometer;
  private wanted: WantedDisplay;
  private interaction: InteractionPrompt;
  private mission: MissionText;
  private notifications: NotificationSystem;
  private radio: RadioUI;
  private pauseMenu: PauseMenu;
  private settings: SettingsPanel;
  private loading: LoadingScreen;

  private uiRoot: HTMLDivElement;

  async init(ctx: GameContext): Promise<void> {
    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    document.body.appendChild(this.uiRoot);

    this.hud = new HUD(this.uiRoot);
    this.minimap = new Minimap(this.uiRoot);
    this.speedometer = new Speedometer(this.uiRoot);
    this.wanted = new WantedDisplay(this.uiRoot);
    this.interaction = new InteractionPrompt(this.uiRoot);
    this.mission = new MissionText(this.uiRoot);
    this.notifications = new NotificationSystem(this.uiRoot);
    this.radio = new RadioUI(this.uiRoot);
    this.pauseMenu = new PauseMenu(this.uiRoot, ctx.events);
    this.settings = new SettingsPanel(this.uiRoot, ctx.events);
    this.loading = new LoadingScreen();

    this.bindEvents(ctx.events);
    this.loadGoogleFonts();
  }

  update(dt: number): void {
    const player = ctx.getSystem('player');
    const state = player.getState();

    this.hud.update({
      health: state.health,
      armor: state.armor,
      money: state.money,
      weaponId: state.weaponId,
      weaponAmmo: 0,  // from Agent 10 later
      wantedLevel: state.wantedLevel,
      isInVehicle: state.isInVehicle,
      vehicleSpeed: 0,  // from vehicle event
      radioStation: null,
      missionObjective: null,
      interactionPrompt: null,
    });

    this.wanted.update(state.wantedLevel);

    const world = ctx.getSystem('world');
    this.minimap.render(
      player.getPosition(),
      0,  // heading from camera
      world.getMinimapData(),
      this.getBlips(),
    );

    this.notifications.update(dt);
  }

  private bindEvents(events: EventBus): void {
    events.on('game:ready', () => this.loading.hide());
    events.on('player:enterVehicle', () => this.speedometer.show());
    events.on('player:exitVehicle', () => this.speedometer.hide());
    events.on('vehicle:speedChange', ({ speedKmh }) => this.speedometer.update(speedKmh));
    events.on('wanted:levelChange', ({ level }) => this.wanted.update(level));
    events.on('player:interactPrompt', ({ text }) => {
      text ? this.interaction.show(text) : this.interaction.hide();
    });
    events.on('mission:start', ({ title, objective }) => this.mission.showMission(title, objective));
    events.on('mission:update', ({ objective }) => this.mission.updateObjective(objective));
    events.on('mission:complete', () => this.mission.hide());
    events.on('ui:notification', ({ text, type, duration }) => this.notifications.show(text, type, duration));
    events.on('player:death', () => this.notifications.show('WASTED', 'error', 3000));
  }
}
```

---

## HUD Layout Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    ★ ★ ★ ☆ ☆          ┌─────────┐       │
│  Mission: Welcome to Vice City        │ MINIMAP │       │
│  Objective: Drive to Downtown         │  150px  │       │
│                                       └─────────┘       │
│                                                         │
│                   (3D game view)                        │
│                                                         │
│                                                         │
│  ████████░░ Health                                      │
│  ██████░░░░ Armor                                       │
│  $50,000  🔫                                           │
│              "Press E to enter Cheetah"    87 km/h     │
└──────────────────────────────────────────────────────────┘
```

---

## Integration Points

| You Provide | Consumers |
|-------------|-----------|
| Full HUD/Menu UI | player experience |
| Settings persistence (localStorage) | 8 (volume), 5 (sensitivity) |
| Pause/resume events | 1, 8 |

| You Consume | From |
|-------------|------|
| `PlayerStateSnapshot` | 5 |
| `MinimapData` | 3 |
| `vehicle:speedChange` | 6 |
| `wanted:levelChange` | 10 |
| `mission:*` events | 10 |
| `player:interactPrompt` | 5, 6 |
| `ui:notification` | 8, 10 |
| `RadioStation` data | 8 |

---

## Acceptance Criteria

- [ ] HUD shows health, armor, money with Vice City pink/teal styling
- [ ] Minimap renders roads, districts, player position (top-right)
- [ ] Tab toggles minimap visibility
- [ ] Speedometer appears in vehicle, shows km/h
- [ ] Wanted stars display and flash (top-center)
- [ ] Interaction prompt shows "Press E to..." near vehicles
- [ ] Mission text shows title + objective
- [ ] "MISSION PASSED!" notification on mission complete
- [ ] "WASTED" on player death
- [ ] Pause menu on Escape (resume, settings, quit)
- [ ] Settings sliders change volume (emit audio:volumeChange)
- [ ] Settings persist in localStorage
- [ ] Loading screen with progress bar on boot
- [ ] `npm run build` passes

---

## DO NOT

- Implement game logic (Agent 10)
- Render 3D elements (Agent 2)
- Handle game input (Agent 5) — only listen for events
- Edit folders outside `src/ui/` and `public/assets/ui/`
