import { SocketContext } from '../SocketContext';
import { ControllerConfig } from "./ControllerConfig";
import { PipeTransform } from '../pipe/PipeTransform';
import { Params } from '../Params';
import { QueryParams } from '../QueryParams';
import { ErrorFilter } from '../filter/ErrorFilter';
import { CanActivateConnect } from '../guard/CanActivateConnect';
import { SOCKETEER_STATUSES } from '../constants/SOCKETEER_STATUSES';
import { Notifier, NotifierCallback } from '../Notifier';
import { RateLimiter } from '../RateLimiter';
import { RateLimitException } from '../exception/RateLimitException';

export abstract class Controller<T = any> {
  private __onSocketDestroyCb = () => { };
  private __contexts: SocketContext<T>[] = [];
  private __connectGuards: CanActivateConnect[];
  private __requestMessagePipes: PipeTransform[];
  private __responseMessagePipes: PipeTransform[];
  private __params: Params;
  private __queryParams: QueryParams;
  private __errorFilter = new ErrorFilter();
  private __pathNotifier: Notifier<unknown>;
  private __currentPath: string;
  private __rateLimiter: RateLimiter | undefined;

  constructor(config: ControllerConfig) {
    const {
      connectGuards,
      requestMessagePipes,
      responseMessagePipes,
      params,
      queryParams,
      errorFilter,
      onSocketDestroyCb,
      pathNotifier,
      currentPath,
    } = config;
    const _this: any = this;

    this.__connectGuards = connectGuards || [];
    this.__requestMessagePipes = requestMessagePipes || [];
    this.__responseMessagePipes = responseMessagePipes || [];
    this.__params = params;
    this.__queryParams = queryParams;
    this.__pathNotifier = pathNotifier;
    this.__currentPath = currentPath;

    if (errorFilter) this.__errorFilter = errorFilter;
    if (onSocketDestroyCb) this.__onSocketDestroyCb = onSocketDestroyCb;

    if (config.rateLimit) {
      this.__rateLimiter = new RateLimiter(config.rateLimit);
    }

    if (_this.$onSocketInit) {
      try {
        _this.$onSocketInit();
      } catch (err) {
        this.__errorFilter.handleError(err);
      }
    }
  }

  protected $subscribePathNotifications<T>(cb: NotifierCallback<T>) {
    return this.__pathNotifier.subscribe(this.__currentPath, cb as any);
  }

  protected $notifyPath<T>(path: string, data: T) {
    let p = path;
    if (!p.startsWith('/')) p = '/' + p;
    this.__pathNotifier.notify(p, data);
  }

  protected $getParams() {
    return { ...this.__params };
  }

  protected $getQueryParams() {
    return { ...this.__queryParams };
  }

  protected $forEachContext(cb: (context: SocketContext<T>) => void): void {
    this.__contexts.forEach(cb);
  }

  async __addSocket(context: SocketContext<T>) {
    try {
      this.__contexts.push(context);
      await this.__addEventsListeners(context);
      await this.__onSocketConnect(context);
    } catch (err: unknown) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  protected async $send(context: SocketContext<T>, msg: any) {
    try {
      let message = msg;
      const pipes = this.__responseMessagePipes;

      for (let i = 0, l = pipes.length; i < l; i++) {
        const pipe = pipes[i];
        try {
          message = await pipe.transform(message, context); // Pipes might need context too
        } catch (err) {
          this.__errorFilter.handleError(err, context.socket);
          return;
        }
      }

      context.socket.send(message);
    } catch (err) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  protected async $sendBroadcastMessage(msg: any) {
    try {
      this.__contexts.forEach(async (ctx) => {
        // Transform per context? Or once? 
        // Pipes transform might depend on context (e.g. user language).
        // Safer to run per context, but slower. 
        // Let's run once for now as per original implementation, but existing implementation didn't have context in transform.
        // Pass undefined as context for broadcast transform? Or first context?
        // Original code: await pipe.transform(message);
        // I'll keep it simple for now, but pipes signature changed? No, I haven't changed Pipe interface yet.
        // I should change Pipe interface to accept context.
        this.$send(ctx, msg);
      });
    } catch (err) {
      this.__errorFilter.handleError(err);
    }
  }

  private async __addEventsListeners(context: SocketContext<T>) {
    const ws = context.socket;
    ws.on('error', (err: Error) => {
      try {
        this.__onSocketError.call(this, err, context);
      } catch (err) {
        this.__errorFilter.handleError(err);
      }
    });

    ws.on('close', (code, reason) => {
      try {
        this.__onSocketClose.call(this, code, reason, context)
      } catch (err) {
        this.__errorFilter.handleError(err);
      }
    });

    ws.on('message', message => {
      try {
        this.__onSocketMessage.call(this, message, context);
      } catch (err) {
        this.__errorFilter.handleError(err, ws);
      }
    });
  }

  private async __onSocketConnect(context: SocketContext<T>) {
    try {
      const _this = this as any;
      const guards = this.__connectGuards || [];

      // Check Rate Limit (Max Connections) - Moved to WSServer?
      // WSServer handles Max Connections (rejects new connection).
      // Here we handle requests rate limit. Or maybe connection limit per controller?
      // Plan said: WSServer checks Max Connections.

      // Guards check
      try {
        let accessDenied = false;
        for (let i = 0, l = guards.length; i < l; i++) {
          const guard = guards[i];
          const canActivate = await guard.canActivate(context);
          if (!canActivate) {
            accessDenied = true;
            break;
          }
        }
        if (accessDenied) {
          context.socket.close(SOCKETEER_STATUSES.ACCESS_DENIED.code, SOCKETEER_STATUSES.ACCESS_DENIED.status);
          return;
        }
      } catch (err: unknown) {
        // ... error handling
        throw err;
      }

      if (_this.$onSocketConnect) _this.$onSocketConnect(context);
    } catch (err: unknown) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  private __onSocketError(err: Error, context: SocketContext<T>) {
    try {
      if ((this as any).$onSocketError) (this as any).$onSocketError(err, context);
    } catch (e) {
      this.__errorFilter.handleError(e);
    }
  }

  private async __onSocketClose(code: number, reason: string | Buffer, context: SocketContext<T>) {
    try {
      if ((this as any).$onSocketClose) await (this as any).$onSocketClose(code, reason, context);
      this.__contexts = this.__contexts.filter(c => c !== context);
      if (!this.__contexts.length) this.__onSocketDestroy();
    } catch (err) {
      this.__errorFilter.handleError(err);
    }
  }

  private async __onSocketMessage(message: any, context: SocketContext<T>) {
    // Rate Limit Check
    if (this.__rateLimiter) {
      if (!this.__rateLimiter.check(context)) {
        throw new RateLimitException();
      }
    }

    let msg: any = message;
    const pipes = this.__requestMessagePipes;

    for (let i = 0, l = pipes.length; i < l; i++) {
      const pipe = pipes[i];
      try {
        msg = await pipe.transform(msg, context); // Pass context to pipes
      } catch (err) {
        // Pipe error -> ErrorFilter w/ context
        this.__errorFilter.handleError(err, context.socket);
        return;
      }
    }

    try {
      if ((this as any).$onSocketMessage) (this as any).$onSocketMessage(msg, context);
    } catch (err) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  private __onSocketDestroy() {
    const t = this as any;
    if (t.$onSocketDestroy) t.$onSocketDestroy();
    try {
      this.__pathNotifier.clear(this.__currentPath);
    } catch (_) { }
    this.__onSocketDestroyCb();
  }

  // Abstract methods definitions for Type Safety
  protected $onSocketInit?(): void;
  protected $onSocketConnect?(context: SocketContext<T>): void;
  protected $onSocketClose?(code: number, reason: string | Buffer, context: SocketContext<T>): void;
  protected $onSocketError?(err: Error, context: SocketContext<T>): void;
  protected $onSocketDestroy?(): void;
  protected $onSocketMessage?(message: any, context: SocketContext<T>): void;
}
