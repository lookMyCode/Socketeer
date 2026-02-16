import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';

export class SocketContext<T = unknown> {
  readonly socket: WebSocket;
  readonly request: IncomingMessage;
  payload!: T;

  constructor(socket: WebSocket, request: IncomingMessage, initialPayload?: T) {
    this.socket = socket;
    this.request = request;
    
    if (initialPayload) this.payload = initialPayload;
  }
}
