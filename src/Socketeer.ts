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
      if (this.rateLimitConfig?.maxConnections) {
        if (this.webSocketServer.clients.size > this.rateLimitConfig.maxConnections) {
          throw new ServiceUnavailableException();
        }
      }

      const context = new SocketContext(ws, request);

      try {
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

          if (accessDenied) {
            throw new AccessDeniedException();
          }
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

        const queryParams: QueryParams = {};

        const url = new URL(request.url || '', 'https://test.test');
        const { searchParams } = url;

        Array.from(url.searchParams.keys()).forEach(key => {
          queryParams[key] = searchParams.get(key);
        });

        let currentPath = url.pathname;

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

        const openedController = this.openedControllers[currentPath];

        if (openedController) {
          const controller = openedController.controller;
          await controller.__addSocket(context);
        } else {
          const currentPathParts = currentPath
            .split('/')
            .map(x => x.trim())
            .filter(x => !!x);

          const currentPathPartsLength = currentPathParts.length;
          let params: Params = {};
          let currentRoute: Route | undefined;

          for (let route of (routes || [])) {
            params = {};

            const pathParts = route.path
              .trim()
              .split('/')
              .map(x => x.trim())
              .filter(x => !!x);

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
          await controller.__addSocket(context);
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
}