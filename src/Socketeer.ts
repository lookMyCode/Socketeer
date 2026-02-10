import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';

import { SocketeerConfig, RateLimitConfig } from './SocketeerConfig';
import { CanActivateConnect } from './guard/CanActivateConnect';
import { OpenedController } from './OpenedController';
import { Route } from './route/Route';
import { Params } from './Params';
import { QueryParams } from './QueryParams';
import { ErrorFilter } from './filter/ErrorFilter';
import { SOCKETEER_STATUSES } from './constants/SOCKETEER_STATUSES';
import { Notifier } from './Notifier';
import { SocketContext } from './SocketContext';


export class Socketeer {
  private webSocketServer: WebSocket.Server;
  private connectGuards: CanActivateConnect[] = [];
  private openedControllers: { [path: string]: OpenedController } = {};
  private errorFilter = new ErrorFilter();
  private pathNotifier = new Notifier<unknown>();
  private rateLimitConfig: RateLimitConfig | undefined;

  constructor(config: SocketeerConfig) {
    let { port, routes, connectGuards, onInit, onConnect, prefixPath, errorFilter } = config;

    if (errorFilter) {
      this.errorFilter = errorFilter;
    }

    if (!prefixPath) prefixPath = '/';
    if (!prefixPath?.startsWith('/')) {
      prefixPath = '/' + prefixPath;
    }

    this.webSocketServer = new WebSocket.Server({ port });
    this.connectGuards = connectGuards || [];
    this.rateLimitConfig = config.rateLimit;

    this.webSocketServer.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      // 0. Check Max Connections
      if (this.rateLimitConfig?.maxConnections) {
        if (this.webSocketServer.clients.size > this.rateLimitConfig.maxConnections) {
          ws.close(SOCKETEER_STATUSES.SERVICE_UNAVAILABLE.code, SOCKETEER_STATUSES.SERVICE_UNAVAILABLE.status);
          return;
        }
      }

      // 1. Create Context
      const context = new SocketContext(ws, request);

      try {
        try {
          let accessDenied = false;

          for (let i = 0, l = this.connectGuards.length; i < l; i++) {
            const guard = this.connectGuards[i];
            // 2. Pass context to guards
            const canActivate = await guard.canActivate(context);

            if (!canActivate) {
              accessDenied = true;
              break;
            }
          }

          if (accessDenied) {
            ws.close(SOCKETEER_STATUSES.ACCESS_DENIED.code, SOCKETEER_STATUSES.ACCESS_DENIED.status);
            return;
          }
        } catch (err: unknown) {
          if (err instanceof Error) {
            ws.close(SOCKETEER_STATUSES.ACCESS_DENIED.code, err.message);
          } else {
            ws.close(SOCKETEER_STATUSES.ACCESS_DENIED.code, SOCKETEER_STATUSES.ACCESS_DENIED.status);
          }

          return;
        }

        const queryParams: QueryParams = {};

        const url = new URL(request.url || '', 'https://test.test');
        const { searchParams } = url;

        Array.from(url.searchParams.keys()).forEach(key => {
          queryParams[key] = searchParams.get(key);
        });

        let currentPath = (request.url || '')
          .split('?')[0]
          .trim();

        if (!currentPath.startsWith('/')) {
          currentPath = '/' + currentPath;
        }
        if (currentPath.startsWith(prefixPath)) {
          currentPath = currentPath.substring(prefixPath.length);
        }
        if (!currentPath.startsWith('/')) {
          currentPath = '/' + currentPath;
        }
        if (currentPath.endsWith('/')) {
          currentPath = currentPath.substring(0, currentPath.length - 1);
        }

        if (this.openedControllers[currentPath]) {
          const controller = this.openedControllers[currentPath].controller;
          // 3. Pass context to controller
          await controller.__addSocket(context);
        } else {
          const currentPathParts = currentPath
            .split('?')[0]
            .split('/')
            .map(x => x.trim())
            .filter(x => !!x);
          const currentPathPartsLength = currentPathParts.length;
          let params: Params = {};
          let currentRoute: Route | undefined;

          for (let i = 0, l = (routes || []).length; i < l; i++) {
            params = {};
            const route = routes[i];
            const pathParts = route.path
              .trim()
              .split('/')
              .map(x => x.trim())
              .filter(x => !!x);

            const pathPartsLength = pathParts.length;
            if (pathPartsLength !== currentPathPartsLength) continue;

            let found = true;

            for (let j = 0; j < pathPartsLength; j++) {
              const pathPart = pathParts[j];
              const currentPathPart = currentPathParts[j];
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

          if (!currentRoute) {
            ws.close(SOCKETEER_STATUSES.NOT_FOUND.code, SOCKETEER_STATUSES.NOT_FOUND.status);
            return;
          }

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
          // 3. Pass context to controller
          await controller.__addSocket(context);
        }

        if (onConnect) {
          try {
            await onConnect();
          } catch (err: unknown) {
            if (err instanceof Error) {
              ws.close(SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.code, SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.status);
            } else {
              ws.close(SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.code, SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.status);
            }
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
}