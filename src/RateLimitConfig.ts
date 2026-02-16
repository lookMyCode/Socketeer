export interface RateLimitConfig {
  maxRequests?: {
    counter: number;
    window: number;
  }
  maxConnections?: number;
}
