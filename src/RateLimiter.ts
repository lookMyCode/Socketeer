import { RateLimitConfig } from './RateLimitConfig';

export class RateLimiter {
  private history = new Map<any, { count: number, start: number }>();

  constructor(private config: RateLimitConfig) { }

  check(key: any): boolean {
    if (!this.config.maxRequests || !this.config.window) return true;

    const record = this.history.get(key);
    const now = Date.now();

    if (!record) {
      this.history.set(key, { count: 1, start: now });
      return true;
    }

    if (now - record.start > this.config.window) {
      record.count = 1;
      record.start = now;
      return true;
    }

    record.count++;
    if (record.count > this.config.maxRequests) {
      return false;
    }

    return true;
  }

  clear(key: any) {
    this.history.delete(key);
  }
}
