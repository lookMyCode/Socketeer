import { SocketContext } from '../SocketContext';
import { ControllerConfig } from "./ControllerConfig";
import { NotifierCallback } from '../Notifier';
export declare abstract class Controller<T = any> {
    private __onSocketDestroyCb;
    private __contexts;
    private __connectGuards;
    private __requestMessagePipes;
    private __responseMessagePipes;
    private __params;
    private __queryParams;
    private __errorFilter;
    private __pathNotifier;
    private __currentPath;
    private __rateLimiter;
    constructor(config: ControllerConfig);
    protected $subscribePathNotifications<T>(cb: NotifierCallback<T>): import("../Notifier").NotifierSubscription;
    protected $notifyPath<T>(path: string, data: T): void;
    protected $getParams(): {
        [key: string]: string;
    };
    protected $getQueryParams(): {
        [key: string]: string | null;
    };
    protected $forEachContext(cb: (context: SocketContext<T>) => void): void;
    __addSocket(context: SocketContext<T>): Promise<void>;
    protected $send(context: SocketContext<T>, msg: any): Promise<void>;
    protected $sendBroadcastMessage(msg: any): Promise<void>;
    private __addEventsListeners;
    private __onSocketConnect;
    private __onSocketError;
    private __onSocketClose;
    private __onSocketMessage;
    private __onSocketDestroy;
    protected $onSocketInit?(): void;
    protected $onSocketConnect?(context: SocketContext<T>): void;
    protected $onSocketClose?(code: number, reason: string | Buffer, context: SocketContext<T>): void;
    protected $onSocketError?(err: Error, context: SocketContext<T>): void;
    protected $onSocketDestroy?(): void;
    protected $onSocketMessage?(message: any, context: SocketContext<T>): void;
}
