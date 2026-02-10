import { WSServerConfig } from './WSServerConfig';
export declare class WSServer {
    private webSocketServer;
    private connectGuards;
    private openedControllers;
    private errorFilter;
    private pathNotifier;
    private rateLimitConfig;
    constructor(config: WSServerConfig);
    notifyPath<T>(path: string, data: T): void;
}
