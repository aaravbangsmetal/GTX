import type { EventBus } from '../shared/events';
import {
  DEFAULT_GTX_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type GTXSettings,
  type UISettings,
} from './types';

type SettingsChangeHandler = (settings: GTXSettings) => void;

export class SettingsPanel {
  private panel: HTMLDivElement;
  private settings: GTXSettings = { ...DEFAULT_GTX_SETTINGS };
  private onChange: SettingsChangeHandler | null = null;

  constructor(
    parent: HTMLElement,
    private readonly events: EventBus,
  ) {
    this.panel = document.createElement('div');
    this.panel.className = 'settings-panel hidden';
    parent.appendChild(this.panel);
    this.settings = this.loadSettings();
    this.render();
  }

  setChangeHandler(handler: SettingsChangeHandler): void {
    this.onChange = handler;
  }

  show(): void {
    this.panel.classList.remove('hidden');
  }

  hide(): void {
    this.panel.classList.add('hidden');
  }

  loadSettings(): GTXSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GTX_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GTXSettings>;
      return { ...DEFAULT_GTX_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_GTX_SETTINGS };
    }
  }

  saveSettings(settings: UISettings): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    this.onChange?.(this.settings);
  }

  getSettings(): GTXSettings {
    return { ...this.settings };
  }

  private render(): void {
    this.panel.innerHTML = '';

    const content = document.createElement('div');
    content.className = 'settings-content';

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'SETTINGS';
    content.appendChild(title);

    content.appendChild(
      this.createSlider('Master Volume', this.settings.masterVolume, 0, 100, (value) => {
        this.settings.masterVolume = value;
        this.emitVolume('master', value / 100);
        this.persist();
      }),
    );

    content.appendChild(
      this.createSlider('Music Volume', this.settings.musicVolume, 0, 100, (value) => {
        this.settings.musicVolume = value;
        this.emitVolume('music', value / 100);
        this.persist();
      }),
    );

    content.appendChild(
      this.createSlider('SFX Volume', this.settings.sfxVolume, 0, 100, (value) => {
        this.settings.sfxVolume = value;
        this.emitVolume('sfx', value / 100);
        this.persist();
      }),
    );

    content.appendChild(
      this.createSlider('Ambient Volume', this.settings.ambientVolume, 0, 100, (value) => {
        this.settings.ambientVolume = value;
        this.emitVolume('ambient', value / 100);
        this.persist();
      }),
    );

    content.appendChild(
      this.createSlider('Mouse Sensitivity', this.settings.mouseSensitivity * 100, 50, 200, (value) => {
        this.settings.mouseSensitivity = value / 100;
        this.persist();
      }),
    );

    content.appendChild(
      this.createSlider('HUD Scale', this.settings.hudScale * 100, 80, 120, (value) => {
        this.settings.hudScale = value / 100;
        this.persist();
      }),
    );

    content.appendChild(
      this.createToggle('Show Minimap', this.settings.showMinimap, (checked) => {
        this.settings.showMinimap = checked;
        this.persist();
      }),
    );

    content.appendChild(
      this.createToggle('Show HUD', this.settings.showHUD, (checked) => {
        this.settings.showHUD = checked;
        this.persist();
      }),
    );

    content.appendChild(
      this.createSelect('Graphics Quality', this.settings.graphicsQuality, ['low', 'medium', 'high'], (value) => {
        this.settings.graphicsQuality = value as GTXSettings['graphicsQuality'];
        this.persist();
      }),
    );

    const actions = document.createElement('div');
    actions.className = 'settings-actions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pause-button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.hide());
    actions.appendChild(closeBtn);

    content.appendChild(actions);
    this.panel.appendChild(content);
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const labelEl = document.createElement('label');
    const valueSpan = document.createElement('span');
    valueSpan.textContent = `${Math.round(value)}`;
    labelEl.textContent = label;
    labelEl.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      valueSpan.textContent = `${Math.round(next)}`;
      onChange(next);
    });

    row.appendChild(labelEl);
    row.appendChild(input);
    return row;
  }

  private createToggle(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'settings-row settings-toggle';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));

    row.appendChild(labelEl);
    row.appendChild(input);
    return row;
  }

  private createSelect(
    label: string,
    value: string,
    options: string[],
    onChange: (value: string) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;

    const select = document.createElement('select');
    for (const option of options) {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option.charAt(0).toUpperCase() + option.slice(1);
      opt.selected = option === value;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => onChange(select.value));

    row.appendChild(labelEl);
    row.appendChild(select);
    return row;
  }

  private emitVolume(group: string, value: number): void {
    this.events.emit('audio:volumeChange', { group, value });
  }

  private persist(): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    this.onChange?.(this.settings);
  }
}
