"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(config) {
        this.config = config;
        this.history = new Map();
    }
    check(key) {
        if (!this.config.maxRequests || !this.config.window)
            return true;
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
    clear(key) {
        this.history.delete(key);
    }
}
exports.RateLimiter = RateLimiter;
