import type { EventBus } from '../shared/events';
import type { IAssetLoader } from '../shared/types';

const LOADING_TIPS = [
  'Tip: Press E near a vehicle to enter it',
  'Tip: Hold Shift to sprint',
  'Tip: Press Q in a vehicle to change radio station',
  'Tip: Avoid police attention for a peaceful tour',
  'Tip: Explore Ocean Beach at sunset for the best views',
];

export class LoadingScreen {
  private overlay: HTMLDivElement | null;
  private bar: HTMLDivElement | null;
  private tip: HTMLParagraphElement | null;

  constructor() {
    this.overlay = document.getElementById('loading-screen') as HTMLDivElement | null;
    this.bar = document.getElementById('loading-fill') as HTMLDivElement | null;
    this.tip = document.createElement('p');
    this.tip.className = 'loading-tip';
    this.tip.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)] ?? LOADING_TIPS[0];
    this.overlay?.appendChild(this.tip);
  }

  bindAssets(assets: IAssetLoader): void {
    assets.onProgress((progress) => {
      this.updateProgress(progress.percent);
    });
  }

  bindEvents(events: EventBus): void {
    events.on('game:ready', () => this.hide());
  }

  updateProgress(percent: number): void {
    if (this.bar) {
      this.bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }
  }

  hide(): void {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    window.setTimeout(() => {
      this.overlay?.remove();
    }, 500);
  }
}
