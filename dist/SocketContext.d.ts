import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
export declare class SocketContext<T = any> {
    readonly socket: WebSocket;
    readonly request: IncomingMessage;
    payload: T;
    constructor(socket: WebSocket, request: IncomingMessage, initialPayload?: T);
}
