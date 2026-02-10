import { RateLimitConfig } from './SocketeerConfig';
export declare class RateLimiter {
    private config;
    private history;
    constructor(config: RateLimitConfig);
    check(key: any): boolean;
    clear(key: any): void;
}
