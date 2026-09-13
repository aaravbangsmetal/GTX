export class MissionText {
  private container: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private objectiveEl: HTMLDivElement;
  private visible = false;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'mission-text hidden';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'mission-title';

    this.objectiveEl = document.createElement('div');
    this.objectiveEl.className = 'mission-objective';

    this.container.appendChild(this.titleEl);
    this.container.appendChild(this.objectiveEl);
    parent.appendChild(this.container);
  }

  showMission(title: string, objective: string): void {
    this.titleEl.textContent = title;
    this.objectiveEl.textContent = objective;
    this.visible = true;
    this.container.classList.remove('hidden');
  }

  updateObjective(objective: string): void {
    this.objectiveEl.textContent = objective;
  }

  hide(): void {
    this.visible = false;
    this.container.classList.add('hidden');
  }

  isVisible(): boolean {
    return this.visible;
  }
}
