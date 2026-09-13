import type { EventBus } from '../shared/events';

export class PauseMenu {
  private overlay: HTMLDivElement;
  private visible = false;
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private onSettings: (() => void) | null = null;

  constructor(
    parent: HTMLElement,
    private readonly events: EventBus,
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pause-overlay hidden';

    const menu = document.createElement('div');
    menu.className = 'pause-menu';

    const title = document.createElement('div');
    title.className = 'pause-title';
    title.textContent = 'PAUSED';

    menu.appendChild(title);
    menu.appendChild(this.createButton('Resume', () => this.hide()));
    menu.appendChild(
      this.createButton('Settings', () => {
        this.onSettings?.();
      }),
    );
    menu.appendChild(
      this.createButton('Save Game', () => {
        this.events.emit('ui:notification', {
          text: 'Saving game...',
          type: 'info',
          duration: 2000,
        });
      }),
    );
    menu.appendChild(
      this.createButton('Quit', () => {
        window.location.reload();
      }),
    );

    this.overlay.appendChild(menu);
    parent.appendChild(this.overlay);

    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  setSettingsHandler(handler: () => void): void {
    this.onSettings = handler;
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.overlay.classList.remove('hidden');
    this.events.emit('game:pause', {});
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay.classList.add('hidden');
    this.events.emit('game:resume', {});
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pause-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }
}
