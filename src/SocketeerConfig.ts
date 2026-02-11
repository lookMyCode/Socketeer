import { ErrorFilter } from "./filter";
import { CanActivateConnect } from "./guard";
import { RateLimitConfig } from "./RateLimitConfig";
import { Route } from "./route";



export interface SocketeerConfig {
  port: number;
  routes: Route[],
  onInit?: () => void | Promise<void>;
  onConnect?: () => void | Promise<void>;
  connectGuards?: CanActivateConnect[];
  prefixPath?: string;
  errorFilter?: ErrorFilter;
  rateLimit?: RateLimitConfig;
}
