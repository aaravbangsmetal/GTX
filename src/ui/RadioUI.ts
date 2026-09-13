import type { RadioStationInfo } from './types';

const AUTO_HIDE_MS = 3000;

export class RadioUI {
  private container: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private taglineEl: HTMLDivElement;
  private visible = false;
  private hideTimer: number | null = null;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'radio-ui hidden';

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'radio-station-name';

    this.taglineEl = document.createElement('div');
    this.taglineEl.className = 'radio-station-tagline';

    this.container.appendChild(this.nameEl);
    this.container.appendChild(this.taglineEl);
    parent.appendChild(this.container);
  }

  show(station: RadioStationInfo): void {
    this.nameEl.textContent = `♫ ${station.name}`;
    this.taglineEl.textContent = station.tagline;
    this.container.style.borderColor = station.color;
    this.nameEl.style.color = station.color;

    this.visible = true;
    this.container.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.container.classList.add('visible');
    });

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
    }
    this.hideTimer = window.setTimeout(() => this.hide(), AUTO_HIDE_MS);
  }

  hide(): void {
    this.visible = false;
    this.container.classList.remove('visible');
    window.setTimeout(() => {
      if (!this.visible) {
        this.container.classList.add('hidden');
      }
    }, 300);
  }

  dispose(): void {
    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer);
    }
  }
}
