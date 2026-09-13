import type { HUDState } from './types';
import { formatMoney } from './UITheme';

export class HUD {
  private container: HTMLDivElement;
  private healthFill: HTMLDivElement;
  private armorBar: HTMLDivElement;
  private armorFill: HTMLDivElement;
  private moneyDisplay: HTMLSpanElement;
  private weaponDisplay: HTMLDivElement;
  private visible = true;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.className = 'hud-container';

    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'hud-bottom-left';

    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    this.healthFill = document.createElement('div');
    this.healthFill.className = 'fill';
    this.healthFill.style.width = '100%';
    healthBar.appendChild(this.healthFill);

    this.armorBar = document.createElement('div');
    this.armorBar.className = 'armor-bar';
    this.armorFill = document.createElement('div');
    this.armorFill.className = 'fill';
    this.armorFill.style.width = '0%';
    this.armorBar.appendChild(this.armorFill);

    this.moneyDisplay = document.createElement('span');
    this.moneyDisplay.className = 'money';
    this.moneyDisplay.textContent = '$0';

    this.weaponDisplay = document.createElement('div');
    this.weaponDisplay.className = 'weapon-icon hidden';

    bottomLeft.appendChild(healthBar);
    bottomLeft.appendChild(this.armorBar);
    bottomLeft.appendChild(this.moneyDisplay);
    bottomLeft.appendChild(this.weaponDisplay);

    this.container.appendChild(bottomLeft);
    parent.appendChild(this.container);
  }

  update(state: HUDState): void {
    this.healthFill.style.width = `${Math.max(0, Math.min(100, state.health))}%`;

    if (state.armor > 0) {
      this.armorBar.classList.remove('hidden');
      this.armorFill.style.width = `${Math.max(0, Math.min(100, state.armor))}%`;
    } else {
      this.armorBar.classList.add('hidden');
    }

    this.moneyDisplay.textContent = `$${Math.max(0, Math.floor(state.money)).toLocaleString('en-US')}`;

    if (state.weaponId) {
      this.weaponDisplay.classList.remove('hidden');
      this.weaponDisplay.innerHTML = '';
      const icon = document.createElement('img');
      icon.src = this.getWeaponIconPath(state.weaponId);
      icon.alt = state.weaponId;
      this.weaponDisplay.appendChild(icon);
    } else {
      this.weaponDisplay.classList.add('hidden');
    }
  }

  show(): void {
    this.visible = true;
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  setScale(scale: number): void {
    this.container.style.transform = `scale(${scale})`;
  }

  isVisible(): boolean {
    return this.visible;
  }

  private getWeaponIconPath(weaponId: string): string {
    const iconMap: Record<string, string> = {
      fists: '/assets/ui/icons/weapon-fists.svg',
      pistol: '/assets/ui/icons/weapon-pistol.svg',
    };
    return iconMap[weaponId] ?? `/assets/ui/icons/weapon-${weaponId}.svg`;
  }
}
