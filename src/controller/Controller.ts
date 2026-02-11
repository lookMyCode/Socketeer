import { SOCKETEER_STATUSES } from "../constants";
import { AccessDeniedException, RateLimitException } from "../exception";
import { ErrorFilter } from "../filter";
import { CanActivateConnect } from "../guard";
import { Notifier, NotifierCallback } from "../notifier";
import { Params } from "../Params";
import { PipeTransform } from "../pipe";
import { QueryParams } from "../QueryParams";
import { RateLimiter } from "../RateLimiter";
import { SocketContext } from "../SocketContext";
import { ControllerConfig } from "./ControllerConfig";


export abstract class Controller<T = unknown> {
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
      rateLimit,
    } = config;

    this.__connectGuards = connectGuards || [];
    this.__requestMessagePipes = requestMessagePipes || [];
    this.__responseMessagePipes = responseMessagePipes || [];
    this.__params = params;
    this.__queryParams = queryParams;
    this.__pathNotifier = pathNotifier;
    this.__currentPath = currentPath;

    if (errorFilter) this.__errorFilter = errorFilter;
    if (onSocketDestroyCb) this.__onSocketDestroyCb = onSocketDestroyCb;

    if (rateLimit) {
      this.__rateLimiter = new RateLimiter(rateLimit);
    }

    if (this.$onSocketInit) {
      try {
        this.$onSocketInit();
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
          message = await pipe.transform(message, context);
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

  protected async $sendBroadcastMessage(msg: unknown) {
    try {
      this.__contexts.forEach(async (ctx) => {
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
      const guards = this.__connectGuards || [];

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
          throw new AccessDeniedException();
        }
      } catch (err: unknown) {
        throw err;
      }

      if (this.$onSocketConnect) this.$onSocketConnect(context);
    } catch (err: unknown) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  private __onSocketError(err: Error, context: SocketContext<T>) {
    try {
      if (this.$onSocketError) this.$onSocketError(err, context);
    } catch (e) {
      this.__errorFilter.handleError(e);
    }
  }

  private async __onSocketClose(code: number, reason: string | Buffer, context: SocketContext<T>) {
    try {
      if (this.$onSocketClose) await this.$onSocketClose(code, reason, context);
      this.__contexts = this.__contexts.filter(c => c !== context);
      if (!this.__contexts.length) this.__onSocketDestroy();
    } catch (err) {
      this.__errorFilter.handleError(err);
    }
  }

  private async __onSocketMessage(message: any, context: SocketContext<T>) {
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
        msg = await pipe.transform(msg, context);
      } catch (err) {
        this.__errorFilter.handleError(err, context.socket);
        return;
      }
    }

    try {
      if (this.$onSocketMessage) await this.$onSocketMessage(msg, context);
    } catch (err) {
      this.__errorFilter.handleError(err, context.socket);
    }
  }

  private __onSocketDestroy() {
    if (this.$onSocketDestroy) this.$onSocketDestroy();

    try {
      this.__pathNotifier.clear(this.__currentPath);
    } catch (_) { }

    this.__onSocketDestroyCb();
  }

  $onSocketInit?(): void | Promise<void>;
  $onSocketConnect?(context: SocketContext<T>): void | Promise<void>;
  $onSocketClose?(code: number, reason: string | Buffer, context: SocketContext<T>): void | Promise<void>;
  $onSocketError?(err: Error, context: SocketContext<T>): void | Promise<void>;
  $onSocketDestroy?(): void | Promise<void>;
  $onSocketMessage?(message: any, context: SocketContext<T>): void | Promise<void>;
}
