"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSServer = void 0;
const WebSocket = __importStar(require("ws"));
const ErrorFilter_1 = require("./filter/ErrorFilter");
const WS_STATUSES_1 = require("./constants/WS_STATUSES");
const Notifier_1 = require("./Notifier");
const SocketContext_1 = require("./SocketContext");
class WSServer {
    constructor(config) {
        this.connectGuards = [];
        this.openedControllers = {};
        this.errorFilter = new ErrorFilter_1.ErrorFilter();
        this.pathNotifier = new Notifier_1.Notifier();
        let { port, routes, connectGuards, onInit, onConnect, prefixPath, errorFilter } = config;
        if (errorFilter) {
            this.errorFilter = errorFilter;
        }
        if (!prefixPath)
            prefixPath = '/';
        if (!prefixPath?.startsWith('/')) {
            prefixPath = '/' + prefixPath;
        }
        this.webSocketServer = new WebSocket.Server({ port });
        this.connectGuards = connectGuards || [];
        this.rateLimitConfig = config.rateLimit;
        this.webSocketServer.on('connection', async (ws, request) => {
            // 0. Check Max Connections
            if (this.rateLimitConfig?.maxConnections) {
                if (this.webSocketServer.clients.size > this.rateLimitConfig.maxConnections) {
                    ws.close(WS_STATUSES_1.WS_STATUSES.SERVICE_UNAVAILABLE.code, WS_STATUSES_1.WS_STATUSES.SERVICE_UNAVAILABLE.status);
                    return;
                }
            }
            // 1. Create Context
            const context = new SocketContext_1.SocketContext(ws, request);
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
                        ws.close(WS_STATUSES_1.WS_STATUSES.ACCESS_DENIED.code, WS_STATUSES_1.WS_STATUSES.ACCESS_DENIED.status);
                        return;
                    }
                }
                catch (err) {
                    if (err instanceof Error) {
                        ws.close(WS_STATUSES_1.WS_STATUSES.ACCESS_DENIED.code, err.message);
                    }
                    else {
                        ws.close(WS_STATUSES_1.WS_STATUSES.ACCESS_DENIED.code, WS_STATUSES_1.WS_STATUSES.ACCESS_DENIED.status);
                    }
                    return;
                }
                const queryParams = {};
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
                }
                else {
                    const currentPathParts = currentPath
                        .split('?')[0]
                        .split('/')
                        .map(x => x.trim())
                        .filter(x => !!x);
                    const currentPathPartsLength = currentPathParts.length;
                    let params = {};
                    let currentRoute;
                    for (let i = 0, l = (routes || []).length; i < l; i++) {
                        params = {};
                        const route = routes[i];
                        const pathParts = route.path
                            .trim()
                            .split('/')
                            .map(x => x.trim())
                            .filter(x => !!x);
                        const pathPartsLength = pathParts.length;
                        if (pathPartsLength !== currentPathPartsLength)
                            continue;
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
                        ws.close(WS_STATUSES_1.WS_STATUSES.NOT_FOUND.code, WS_STATUSES_1.WS_STATUSES.NOT_FOUND.status);
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
                    };
                    this.openedControllers[currentPath] = openedController;
                    // 3. Pass context to controller
                    await controller.__addSocket(context);
                }
                if (onConnect) {
                    try {
                        await onConnect();
                    }
                    catch (err) {
                        if (err instanceof Error) {
                            ws.close(WS_STATUSES_1.WS_STATUSES.INTERNAL_SERVER_ERROR.code, WS_STATUSES_1.WS_STATUSES.INTERNAL_SERVER_ERROR.status);
                        }
                        else {
                            ws.close(WS_STATUSES_1.WS_STATUSES.INTERNAL_SERVER_ERROR.code, WS_STATUSES_1.WS_STATUSES.INTERNAL_SERVER_ERROR.status);
                        }
                    }
                }
            }
            catch (err) {
                this.errorFilter.handleError(err, ws);
            }
        });
        if (onInit)
            onInit();
    }
    notifyPath(path, data) {
        this.pathNotifier.notify(path, data);
    }
}
exports.WSServer = WSServer;
