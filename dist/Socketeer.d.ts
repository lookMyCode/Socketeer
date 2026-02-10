import { SocketeerConfig } from './SocketeerConfig';
export declare class Socketeer {
    private webSocketServer;
    private connectGuards;
    private openedControllers;
    private errorFilter;
    private pathNotifier;
    private rateLimitConfig;
    constructor(config: SocketeerConfig);
    notifyPath<T>(path: string, data: T): void;
}
