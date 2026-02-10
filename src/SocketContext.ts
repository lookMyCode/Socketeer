import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';

export class SocketContext<T = any> {
  public readonly socket: WebSocket;
  public readonly request: IncomingMessage;
  public payload!: T;

  constructor(socket: WebSocket, request: IncomingMessage, initialPayload?: T) {
    this.socket = socket;
    this.request = request;
    if (initialPayload) this.payload = initialPayload;
  }
}
