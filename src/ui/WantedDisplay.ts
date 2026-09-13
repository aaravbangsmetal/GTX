const MAX_STARS = 5;

export class WantedDisplay {
  private container: HTMLDivElement;
  private stars: HTMLImageElement[] = [];
  private currentLevel = 0;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'wanted-display';

    for (let i = 0; i < MAX_STARS; i += 1) {
      const star = document.createElement('img');
      star.className = 'wanted-star';
      star.src = '/assets/ui/icons/star.svg';
      star.alt = 'Wanted star';
      this.stars.push(star);
      this.container.appendChild(star);
    }

    parent.appendChild(this.container);
  }

  update(level: number): void {
    this.currentLevel = Math.max(0, Math.min(MAX_STARS, level));

    this.stars.forEach((star, index) => {
      star.classList.toggle('active', index < this.currentLevel);
    });

    this.container.classList.toggle('flashing', this.currentLevel > 0);
  }

  getLevel(): number {
    return this.currentLevel;
  }
}
