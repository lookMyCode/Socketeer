import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';

import { ServiceUnavailableException, AccessDeniedException, SocketeerException, InternalServerErrorException, NotFoundException } from './exception';
import { ErrorFilter } from './filter';
import { CanActivateConnect } from './guard';
import { Notifier } from './notifier';
import { OpenedController } from './OpenedController';
import { Params } from './Params';
import { QueryParams } from './QueryParams';
import { RateLimitConfig } from './RateLimitConfig';
import { Route } from './route';
import { SocketContext } from './SocketContext';
import { SocketeerConfig } from './SocketeerConfig';




export class Socketeer {
  private webSocketServer: WebSocket.Server;
  private connectGuards: CanActivateConnect[] = [];
  private openedControllers: { [path: string]: OpenedController } = {};
  private errorFilter = new ErrorFilter();
  private pathNotifier = new Notifier<unknown>();
  private rateLimitConfig?: RateLimitConfig;

  constructor(config: SocketeerConfig) {
    let { 
      port, 
      routes, 
      connectGuards, 
      onInit, 
      onConnect, 
      prefixPath, 
      errorFilter 
    } = config;

    if (errorFilter) this.errorFilter = errorFilter;

    prefixPath = this.normalizePath(prefixPath);

    this.webSocketServer = new WebSocket.Server({ port });
    this.connectGuards = connectGuards || [];
    this.rateLimitConfig = config.rateLimit;

    this.webSocketServer.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      try {
        const context = new SocketContext(ws, request);

        this.checkRateLimit();
        await this.checkGuards(context);

        const url = new URL(request.url || '', 'https://test.test');
        const queryParams: QueryParams = this.parseQueryParams(url);
        let currentPath = this.parseCurrentPath(url, prefixPath);
        const openedController = this.openedControllers[currentPath];

        if (openedController) {
          const controller = openedController.controller;
          await (controller as unknown as any).__addSocket(context);
        } else {
          const { currentRoute, params } = this.findCurrentRouteWithParams(routes, currentPath);
          const { path, controller: C } = currentRoute;
          
          const controller = new C({
            connectGuards: currentRoute.connectGuards || [],
            requestMessagePipes: currentRoute.requestMessagePipes || [],
            responseMessagePipes: currentRoute.responseMessagePipes || [],
            onSocketDestroyCb: () => {
              delete this.openedControllers[currentPath];
            },
            params,
            queryParams,
            pathNotifier: this.pathNotifier,
            currentPath,
            request,
            rateLimit: currentRoute.rateLimit || this.rateLimitConfig,
          });

          const openedController = {
            path,
            currentPath,
            controller,
          }

          this.openedControllers[currentPath] = openedController;
          await (controller as unknown as any).__addSocket(context);
        }

        if (onConnect) {
          try {
            await onConnect();
          } catch (err: unknown) {
            throw new InternalServerErrorException();
          }
        }
      } catch (err: unknown) {
        this.errorFilter.handleError(err, ws);
      }
    });

    if (onInit) onInit();
  }

  notifyPath<T>(path: string, data: T) {
    this.pathNotifier.notify(path, data);
  }

  private normalizePath(path: string | undefined) {
    if (!path) path = '/';
    if (!path?.startsWith('/')) path = '/' + path;
    if (path.endsWith('/')) path = path.substring(0, path.length - 1);

    return path;
  }

  private checkRateLimit() {
    if (!this.rateLimitConfig?.maxConnections) return;
    if (this.webSocketServer.clients.size <= this.rateLimitConfig.maxConnections) return;
    
    throw new ServiceUnavailableException();
  }

  private async checkGuards(context: SocketContext) {
    try {
      let accessDenied = false;

      for (let i = 0, l = this.connectGuards.length; i < l; i++) {
        const guard = this.connectGuards[i];
        const canActivate = await guard.canActivate(context);

        if (!canActivate) {
          accessDenied = true;
          break;
        }
      }

      if (accessDenied) throw new AccessDeniedException();
    } catch (err: unknown) {
      if (err instanceof SocketeerException) {
        throw err;
      } else if (err instanceof Error) {
        console.error(err);
        throw new InternalServerErrorException();
      } else {
        console.error(err);
        throw new AccessDeniedException();
      }
    }
  }

  private parseQueryParams(url: URL) {
    const queryParams: QueryParams = {};
    const { searchParams } = url;

    Array.from(url.searchParams.keys()).forEach(key => {
      queryParams[key] = searchParams.get(key);
    });

    return queryParams;
  }

  private parseCurrentPath(url: URL, prefixPath: string) {
    let currentPath = this.normalizePath(url.pathname);
    if (currentPath.startsWith(prefixPath)) currentPath = currentPath.substring(prefixPath.length);
    return currentPath;
  }

  private pathToParts(path: string) {
    return path
      .trim()
      .split('/')
      .map(x => x.trim())
      .filter(x => !!x);
  }

  private findCurrentRouteWithParams(routes: Route[], currentPath: string) {
    const currentPathParts = this.pathToParts(currentPath);
    const currentPathPartsLength = currentPathParts.length;
    let params: Params = {};
    let currentRoute: Route | undefined;

    for (let route of (routes || [])) {
      params = {};

      const pathParts = this.pathToParts(route.path);
      const pathPartsLength = pathParts.length;

      if (pathPartsLength !== currentPathPartsLength) continue;

      let found = true;

      for (let i = 0; i < pathPartsLength; i++) {
        const pathPart = pathParts[i];
        const currentPathPart = currentPathParts[i];
        const isParam = pathPart.startsWith(':');

        if (!isParam && pathPart !== currentPathPart) {
          found = false;
          break;
        }

        if (isParam) {
          const key = pathPart.substring(1);
          params[key] = currentPathPart;
        }
      }

      if (found) {
        currentRoute = route;
        break;
      }
    }

    if (!currentRoute) throw new NotFoundException();
    
    return {
      currentRoute, params,
    }
  }
}