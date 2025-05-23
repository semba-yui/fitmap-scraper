export class Time {
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return Time.sleep(delay);
  }

  static formatDateTime(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  static getTimestamp(): string {
    return new Date().toISOString();
  }
} 