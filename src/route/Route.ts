import { Controller } from "../controller/Controller";
import { ControllerConfig } from "../controller/ControllerConfig";
import { CanActivateConnect } from "../guard/CanActivateConnect";
import { PipeTransform } from "../pipe/PipeTransform";
import { RateLimitConfig } from "../RateLimitConfig";


export interface Route {
  path: string,
  controller: new (config: ControllerConfig) => Controller,
  connectGuards?: CanActivateConnect[];
  requestMessagePipes?: PipeTransform[];
  responseMessagePipes?: PipeTransform[];
  rateLimit?: RateLimitConfig;
}
