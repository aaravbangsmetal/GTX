import { VICE_CITY_THEME } from './UITheme';

export class Speedometer {
  private container: HTMLDivElement;
  private speedText: HTMLSpanElement;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'speedometer hidden';

    this.speedText = document.createElement('span');
    this.speedText.className = 'speed-value';
    this.speedText.textContent = '0 km/h';

    this.container.appendChild(this.speedText);
    parent.appendChild(this.container);
  }

  update(speedKmh: number): void {
    this.speedText.textContent = `${Math.round(Math.max(0, speedKmh))} km/h`;
  }

  show(): void {
    this.visible = true;
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  isVisible(): boolean {
    return this.visible;
  }

  getAccentColor(): string {
    return VICE_CITY_THEME.colors.secondary;
  }
}
