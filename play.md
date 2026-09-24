# How to play GTX

GTX is a browser open-world game with a Vice City mood: pink sunsets, neon nights, and a compact coastal city. You walk, steal cars, shoot, take missions, and lose the cops. There is no multiplayer and no building interiors.

## Start

1. From the repo root: `npm install`, then `npm run dev`.
2. Open the local Vite URL in a desktop browser (Chrome is the intended target).
3. Wait out the loading screen, then **click the canvas**. Mouse look only works while the pointer is locked.
4. You spawn on **Ocean Beach**. Use the HUD (health, armor, cash, wanted stars, minimap) as your status bar.

Escape unlocks the mouse and opens pause. Click the canvas again after Resume to re-lock look.

## On foot

| Input | Action |
|-------|--------|
| W A S D or arrows | Move relative to the camera |
| Mouse | Look around (pointer locked) |
| Mouse wheel | Zoom the third-person camera |
| Shift | Sprint |
| Space | Jump |
| Left click | Attack / fire |
| Right click | Aim |
| E | Enter the nearest parked or traffic car (within about 4 m) |
| 1 / 2 / 3 | Fists / pistol / SMG |
| R | Reload |
| Tab | Toggle minimap |
| F3 | Toggle FPS / draw-call overlay |

A gamepad works as a secondary option: left stick move, right stick look, A jump, X enter, RT sprint.

Walk into glowing pickups for health, armor, cash, ammo, and weapons. They respawn on a timer except the first pistol.

## Vehicles

Press **E** beside a car to take the driver seat. Stealing a ride is a crime and adds a wanted star.

| Input | Action |
|-------|--------|
| W | Throttle |
| S | Brake / reverse |
| A / D | Steer |
| Space | Handbrake (easier to drift) |
| Q | Next radio station (only while the radio is on) |
| E | Exit onto the passenger side of the car |

The speedometer shows km/h while you drive. Traffic and pedestrians share the roads; hard hits can raise heat.

## What to do

A few seconds after boot, **Welcome to Vice City** starts. Follow the mission marker on the minimap.

1. **Welcome to Vice City** — enter a vehicle and drive to Downtown. Reward $500.
2. **Neighborhood Watch** — go to Little Havana and eliminate 3 hostiles. Reward $1000.
3. **Express Delivery** — grab the package at Vice Port and deliver it to Starfish Island in 3 minutes. Reward $2000.

Missions unlock in order. Objective text lives on the HUD; yellow/mission blips mark where to go.

## Wanted and combat

Stars go from 0 to 5.

- Steal a car: +1 star
- Shoot a civilian: +1 star
- Shoot police: +2 stars
- Heavy vehicle collisions: +1 star

Police chase while stars are up. Hide until they lose you; a star drops after about 30 seconds out of sight (45s at 3 stars, 60s at 4+). Stay unseen until the HUD is clear.

## Pause, settings, save

**Escape** pauses the game. Resume, open Settings, or Quit (Quit reloads the page).

Settings (volume, mouse sensitivity, HUD scale, minimap) persist in the browser via `localStorage`.

The first time you pause, progress is auto-saved to `localStorage` (`gtx-save`) if no save exists yet: position, health, armor, cash, weapons, missions, and wanted level. The pause **Save Game** button currently only shows a “Saving game…” toast; it does not write a second slot. There is no Load button in the menu.

## Tips

- Hold Shift on foot; do not floor it through crowds if you want a quiet tour.
- Ocean Beach at sunset is the intended first look at the art direction.
- If look stops working, click the canvas again after closing pause.
- This is a keyboard-and-mouse demo first. Touch controls are not in v1.
