export class InteractionPrompt {
  private container: HTMLDivElement;
  private textEl: HTMLSpanElement;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'interaction-prompt hidden';

    this.textEl = document.createElement('span');
    this.container.appendChild(this.textEl);
    parent.appendChild(this.container);
  }

  show(text: string): void {
    this.textEl.textContent = text;
    this.visible = true;
    this.container.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.container.classList.add('visible');
    });
  }

  hide(): void {
    this.visible = false;
    this.container.classList.remove('visible');
    window.setTimeout(() => {
      if (!this.visible) {
        this.container.classList.add('hidden');
      }
    }, 250);
  }

  isVisible(): boolean {
    return this.visible;
  }
}
