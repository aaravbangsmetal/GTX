import * as THREE from 'three';
import { PlayerAnimState } from './types';

const CLIP_NAMES: Partial<Record<PlayerAnimState, string>> = {
  [PlayerAnimState.IDLE]: 'idle',
  [PlayerAnimState.WALK]: 'walk',
  [PlayerAnimState.RUN]: 'run',
  [PlayerAnimState.JUMP]: 'jump',
  [PlayerAnimState.FALL]: 'fall',
};

export class PlayerAnimator {
  private currentState = PlayerAnimState.IDLE;
  private actions = new Map<PlayerAnimState, THREE.AnimationAction>();
  private mixer: THREE.AnimationMixer | null = null;

  init(mixer: THREE.AnimationMixer | null, clips: THREE.AnimationClip[]): void {
    this.mixer = mixer;
    this.actions.clear();

    if (!mixer) return;

    for (const [state, name] of Object.entries(CLIP_NAMES)) {
      const clip = clips.find((c) => c.name === name);
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      this.actions.set(Number(state) as PlayerAnimState, action);
    }

    const idle = this.actions.get(PlayerAnimState.IDLE);
    idle?.play();
  }

  setState(state: PlayerAnimState): void {
    if (state === this.currentState) return;
    if (!this.mixer) {
      this.currentState = state;
      return;
    }

    const next = this.actions.get(state);
    const current = this.actions.get(this.currentState);
    if (!next) {
      this.currentState = state;
      return;
    }

    current?.stop();
    next.play();
    this.currentState = state;
  }

  update(dt: number, speed: number, grounded: boolean, verticalVelocity: number): void {
    if (!this.mixer) return;
    this.mixer.update(dt);

    if (!grounded) {
      this.setState(verticalVelocity > 0.5 ? PlayerAnimState.JUMP : PlayerAnimState.FALL);
      return;
    }

    if (speed > 8) {
      this.setState(PlayerAnimState.RUN);
    } else if (speed > 0.5) {
      this.setState(PlayerAnimState.WALK);
    } else {
      this.setState(PlayerAnimState.IDLE);
    }
  }

  getCurrentState(): PlayerAnimState {
    return this.currentState;
  }
}
