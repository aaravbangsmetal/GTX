import type { EventBus } from '../shared/events';
import type { InputState } from './types';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space',
  'KeyE', 'KeyF', 'Tab', 'Escape',
]);

function createEmptyInput(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
    enterPassenger: false,
    attack: false,
    aim: false,
    mouseX: 0,
    mouseY: 0,
    scrollDelta: 0,
  };
}

export class InputManager {
  private state: InputState = createEmptyInput();
  private pointerLocked = false;
  private gamepadIndex: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private events: EventBus | null = null;
  private bound = false;

  init(canvas: HTMLCanvasElement, events?: EventBus): void {
    this.canvas = canvas;
    this.events = events ?? null;
    if (this.bound) return;
    this.bound = true;
    this.bindKeyboard();
    this.bindPointerLock();
    this.bindMouse();
    this.bindGamepad();
  }

  update(): InputState {
    this.pollGamepad();
    return { ...this.state, mouseX: 0, mouseY: 0, scrollDelta: 0 };
  }

  readCameraInput(): Pick<InputState, 'mouseX' | 'mouseY' | 'scrollDelta'> {
    const input = {
      mouseX: this.state.mouseX,
      mouseY: this.state.mouseY,
      scrollDelta: this.state.scrollDelta,
    };
    this.state.mouseX = 0;
    this.state.mouseY = 0;
    this.state.scrollDelta = 0;
    return input;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.pointerLocked && GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = true;
        break;
      case 'Space':
        this.state.jump = true;
        break;
      case 'KeyE':
        this.state.interact = true;
        break;
      case 'KeyF':
        this.state.enterPassenger = true;
        break;
      case 'Tab':
        if (this.pointerLocked) {
          e.preventDefault();
          this.events?.emit('ui:notification', {
            text: 'Minimap toggle',
            type: 'info',
            duration: 1,
          });
        }
        break;
      case 'Escape':
        if (this.pointerLocked) {
          document.exitPointerLock();
        }
        break;
      default:
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = false;
        break;
      case 'Space':
        this.state.jump = false;
        break;
      case 'KeyE':
        this.state.interact = false;
        break;
      case 'KeyF':
        this.state.enterPassenger = false;
        break;
      default:
        break;
    }
  };

  private bindPointerLock(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.canvas?.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked) {
        this.releaseAllKeys();
      }
    });
  }

  private bindMouse(): void {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.state.mouseX += e.movementX;
    this.state.mouseY += e.movementY;
  };

  private onWheel = (e: WheelEvent): void => {
    this.state.scrollDelta += e.deltaY * 0.01;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    if (e.button === 0) this.state.attack = true;
    if (e.button === 2) this.state.aim = true;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.state.attack = false;
    if (e.button === 2) this.state.aim = false;
  };

  private bindGamepad(): void {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
  }

  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;
    const pad = navigator.getGamepads()[this.gamepadIndex];
    if (!pad) return;

    const lx = pad.axes[0] ?? 0;
    const ly = pad.axes[1] ?? 0;
    const rx = pad.axes[2] ?? 0;
    const ry = pad.axes[3] ?? 0;
    const threshold = 0.2;

    this.state.forward = ly < -threshold;
    this.state.backward = ly > threshold;
    this.state.left = lx < -threshold;
    this.state.right = lx > threshold;

    if (Math.abs(rx) > threshold) this.state.mouseX += rx * 4;
    if (Math.abs(ry) > threshold) this.state.mouseY += ry * 4;

    this.state.jump = pad.buttons[0]?.pressed ?? false;
    this.state.interact = pad.buttons[2]?.pressed ?? false;
    this.state.sprint = (pad.buttons[7]?.value ?? 0) > 0.5;
  }

  private releaseAllKeys(): void {
    this.state.forward = false;
    this.state.backward = false;
    this.state.left = false;
    this.state.right = false;
    this.state.sprint = false;
    this.state.jump = false;
    this.state.interact = false;
    this.state.enterPassenger = false;
    this.state.attack = false;
    this.state.aim = false;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.bound = false;
  }
}
