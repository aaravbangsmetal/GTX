export interface DevStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  entities: number;
}

export class DevOverlay {
  private element: HTMLDivElement;
  private visible = false;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private stats: DevStats = { fps: 0, drawCalls: 0, triangles: 0, entities: 0 };

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'dev-overlay';
    this.element.className = 'dev-overlay hidden';
    document.body.appendChild(this.element);

    window.addEventListener('keydown', (event) => {
      if (event.key === 'F3') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  show(): void {
    this.visible = true;
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.element.classList.add('hidden');
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  update(partial: Partial<DevStats>): void {
    this.stats = { ...this.stats, ...partial };
    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    if (!this.visible) return;

    const tris = this.stats.triangles >= 1_000_000
      ? `${(this.stats.triangles / 1_000_000).toFixed(1)}M`
      : `${Math.round(this.stats.triangles / 1000)}K`;

    this.element.textContent =
      `FPS: ${this.currentFps} | Draw: ${this.stats.drawCalls} | Tris: ${tris} | Entities: ${this.stats.entities}`;
  }

  dispose(): void {
    this.element.remove();
  }
}
