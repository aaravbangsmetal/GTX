export class Economy {
  private money = 0;

  getMoney(): number {
    return this.money;
  }

  setMoney(amount: number): void {
    this.money = Math.max(0, amount);
  }

  add(amount: number): void {
    if (amount <= 0) return;
    this.money += amount;
  }

  spend(amount: number): boolean {
    if (amount <= 0 || this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  canAfford(amount: number): boolean {
    return this.money >= amount;
  }
}
