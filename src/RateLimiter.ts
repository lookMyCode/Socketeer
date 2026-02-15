import { RateLimitConfig } from './RateLimitConfig';
import { SocketContext } from './SocketContext';


export class RateLimiter {
  private history = new Map<SocketContext<unknown>, { count: number, start: number }>();

  constructor(private config: RateLimitConfig) { }

  check(key: SocketContext<unknown>): boolean {
    if (!this.config.maxRequests) return true;

    const { counter, window } = this.config.maxRequests;
    const record = this.history.get(key);
    const now = Date.now();

    if (!record) {
      this.history.set(key, { count: 1, start: now });
      return true;
    }

    if (now - record.start > window) {
      record.count = 1;
      record.start = now;
      return true;
    }

    record.count++;

    return counter >= record.count;
  }

  clear(key: any) {
    this.history.delete(key);
  }
}
