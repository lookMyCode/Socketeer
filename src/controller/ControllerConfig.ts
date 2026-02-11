import { PipeTransform } from '../pipe/PipeTransform';
import { Params } from '../Params';
import { QueryParams } from '../QueryParams';
import { ErrorFilter } from '../filter/ErrorFilter';
import { CanActivateConnect } from '../guard/CanActivateConnect';
import { Notifier } from '../notifier/Notifier';
import { IncomingMessage } from 'http';
import { RateLimitConfig } from '../RateLimitConfig';


export interface ControllerConfig {
  connectGuards?: CanActivateConnect[];
  requestMessagePipes?: PipeTransform[];
  responseMessagePipes?: PipeTransform[];
  onSocketDestroyCb?: () => void;
  params: Params;
  queryParams: QueryParams;
  errorFilter?: ErrorFilter;
  pathNotifier: Notifier<unknown>;
  currentPath: string;
  request: IncomingMessage;
  rateLimit?: RateLimitConfig;
}
