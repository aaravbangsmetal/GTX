import type { InputState } from './types';

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
  private bound = false;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    if (this.bound) return;
    this.bound = true;
    this.bindKeyboard();
  }

  update(): InputState {
    this.state.mouseX = 0;
    this.state.mouseY = 0;
    this.state.scrollDelta = 0;
    return { ...this.state };
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
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

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.bound = false;
  }
}
