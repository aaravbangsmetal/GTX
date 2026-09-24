# Playing GTX

GTX is a browser-based open-world driving and action prototype set in a compact Vice City-inspired coastal city. The current build supports third-person movement, vehicles, traffic, pedestrians, combat, wanted levels, pickups, audio, a minimap, and a small mission framework.

This guide describes the controls and gameplay that are wired into the current build. Some systems are deliberately prototype-level: there is no multiplayer, no building-interior gameplay, and no in-game mission selector yet.

## Start the game

From the repository root:

```bash
npm install
npm run dev
```

Open the local Vite URL in a desktop browser. Chrome is the primary target because the game uses WebGL, pointer lock, keyboard input, and browser audio. Wait for the loading screen to finish, then click the game canvas once. The click does three useful things:

- Locks the pointer so mouse movement controls the camera.
- Unlocks browser audio playback.
- Puts focus on the game surface for keyboard and mouse input.

The player starts in Ocean Beach. The HUD shows health, armor when available, money, the current weapon, wanted stars, and the minimap.

Press `Escape` to release the pointer and open the pause menu. After resuming, click the canvas again to restore mouse look.

## First five minutes

1. Click the canvas after the loading screen disappears.
2. Move around Ocean Beach with `W`, `A`, `S`, and `D`.
3. Hold `Shift` while moving when you need to cover ground quickly.
4. Find a parked or traffic vehicle and press `E` when the interaction prompt appears.
5. Drive carefully for a moment to learn the handling and watch the speedometer.
6. The first mission, `Welcome to Vice City`, starts automatically a few seconds after boot.
7. Read the objective text and follow the rotating mission marker in the world.

## Controls

### On foot

- `W`, `A`, `S`, `D`: Move relative to the camera.
- Arrow keys: Move on foot as an alternative to `W`, `A`, `S`, `D`.
- Mouse movement: Look around while the pointer is locked.
- Mouse wheel: Zoom the third-person camera.
- Hold `Shift`: Sprint.
- `Space`: Jump.
- `E`: Enter the nearest usable vehicle when close enough.
- Left mouse button: Attack or fire the selected weapon.
- `1`: Select fists.
- `2`: Select the pistol.
- `3`: Select the SMG.
- `R`: Reload the selected firearm.
- `Escape`: Release the pointer and pause.
- `F3`: Show or hide the performance overlay.

The gamepad fallback uses the left stick for movement, the right stick for camera look, the A button for jump, the X button for interaction, and the right trigger for sprint. Keyboard and mouse provide the most complete control set.

### In a vehicle

- `W`: Accelerate.
- `S`: Brake or apply reverse throttle.
- `A` and `D`: Steer.
- `Space`: Handbrake. Use it for tighter turns or a controlled slide.
- `E`: Exit the vehicle.
- `Q`: Change to the next radio station.

Vehicle steering currently uses `W`, `A`, `S`, and `D`; the arrow-key alternative is only handled by the on-foot input system. The speedometer appears while driving and reports the vehicle speed in km/h.

Entering a vehicle always counts as a crime in the current prototype, including entering a parked vehicle. Traffic vehicles and pedestrians continue to simulate around you while you drive, and strong collisions can damage or remove a vehicle.

## Camera and pointer lock

The camera is third-person. Mouse look is active only while the browser pointer is locked to the canvas. If the camera stops responding:

1. Press `Escape` once to make sure the game is not paused.
2. Click the canvas again.
3. Accept the browser's pointer-lock prompt if one appears.

The camera can be moved closer or farther away with the mouse wheel. The `Mouse Sensitivity` setting is stored with the other settings, but live sensitivity tuning is not fully connected to camera input yet.

## Combat and pickups

The default weapon is fists. The pistol and SMG become useful after collecting their weapon pickups. Walk into a glowing pickup to collect it automatically; no separate pickup button is required.

Pickup types include:

- Health: Restores health.
- Armor: Adds armor protection.
- Weapon: Gives the pistol or SMG and an initial magazine.
- Ammo: Adds pistol ammunition in the current pickup implementation.
- Money: Adds cash to the HUD.

Weapon behavior:

- Fists are short-range melee attacks and do not use ammunition.
- The pistol is semi-automatic and uses 12-round magazines.
- The SMG is automatic and uses 30-round magazines.
- Firearms stop firing when their current magazine is empty.
- Press `R` to start a reload when reserve ammunition is available.

Left click fires the current weapon while the pointer is locked. Holding the button supports automatic fire for the SMG. The right mouse button is not currently used by the gameplay system for a separate aim mode.

Pickups with a positive respawn time return after their timer expires. The first weapon pickup does not respawn.

## Missions

Mission objective text appears in the HUD. Mission objectives also create rotating colored cones in the world:

- Yellow: Reach or general location objective.
- Red: Elimination objective.
- Blue: Collection objective.
- Green: Delivery objective.

### Welcome to Vice City

This mission starts automatically shortly after the game becomes ready.

1. Enter a vehicle.
2. Drive to the Downtown marker.
3. Reach the marker area to complete the mission.

Reward: `$500`.

### Neighborhood Watch

This mission is registered as the next mission and requires `Welcome to Vice City` to be complete.

1. Go to Little Havana.
2. Eliminate three hostiles.

Reward: `$1,000`.

### Express Delivery

This mission is registered after `Neighborhood Watch` and has a three-minute delivery limit.

1. Pick up the package at Vice Port.
2. Deliver it to Starfish Island before the timer expires.

Reward: `$2,000`.

The mission definitions and prerequisite checks are present, but the current UI does not expose a mission-start interaction for missions two and three. In the current playable loop, only `Welcome to Vice City` is started automatically.

## Exploring the city

The world is divided into five districts with different visual and audio identities:

- Ocean Beach: The starting coastal district, with beach and art-deco scenery.
- Downtown: The denser high-rise area used by the first mission.
- Little Havana: The neighborhood used by `Neighborhood Watch`.
- Vice Port: The industrial dock area used by `Express Delivery` pickup.
- Starfish Island: The destination area for the delivery mission.

The minimap shows the road and district layout. Mission cones are placed in the 3D world, so use the objective text and the terrain around the marker when navigating. The minimap mission-blip list is not populated by the current UI yet.

## Wanted level

Wanted level ranges from zero to five stars. The current crime rules are:

- Entering a vehicle adds one star.
- Hitting an NPC with a weapon adds one star.
- Hitting a police NPC with a weapon adds two stars.
- A heavy physics collision adds one star.
- Driving fast enough to hit pedestrian-speed thresholds marks criminal activity, but does not by itself add a star.

When police can see the player, wanted-level decay pauses. Once the player is hidden, stars begin to decay:

- Zero through two stars: 30 seconds per star.
- Three stars: 45 seconds per star.
- Four or five stars: 60 seconds per star.

The wanted display flashes while heat is active. Break line of sight and keep moving away from police until the display clears.

## Audio and radio

The game starts its main music after the first user interaction. Entering a vehicle fades the main music down and activates the radio. Press `Q` while driving to cycle through:

- Wave 103
- V-Rock
- VCPR

Leaving the vehicle deactivates the radio and fades the main music back in. Volume groups for master, music, sound effects, and ambient audio are available in Settings.

## Pause, settings, and saves

Press `Escape` to open the pause menu. The menu provides Resume, Settings, Save Game, and Quit. Quit reloads the page.

Settings include:

- Master, music, sound-effect, and ambient volume.
- Mouse sensitivity.
- HUD scale.
- Show or hide the minimap.
- Graphics quality selection.

Settings are stored in browser `localStorage` under the game's settings key, so they persist across page reloads in the same browser profile. HUD scale and minimap visibility apply immediately. Mouse sensitivity and graphics quality are stored, but their live runtime effects are not fully wired yet.

The first pause action automatically writes a save to `localStorage` under `gtx-save` if no save already exists. The saved data includes player position, health, armor, cash, weapon and ammunition, completed mission progress, and wanted level. The pause-menu `Save Game` button currently displays a saving notification but does not overwrite an existing save. There is no Load button or automatic load-on-start flow in the current UI.

## Performance and troubleshooting

Press `F3` to show the development overlay with FPS, draw calls, triangle count, and entity count. It is useful for checking whether a performance problem is rendering-related.

If the game does not respond:

- Confirm the Vite server is still running.
- Reload the page and click the canvas after loading completes.
- Check that the browser allows WebGL and pointer lock.
- Check browser audio permissions after the first canvas click.
- Use Settings to reduce audio volume or hide the HUD/minimap if the screen is crowded.
- Clear the site's local storage only if you intentionally want to remove saved settings and the `gtx-save` entry.

The current build is designed for desktop keyboard and mouse play. Touch controls, a complete mission browser, multiple save slots, and a full load flow are not implemented yet.
