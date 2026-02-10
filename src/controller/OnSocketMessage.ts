import WebSocket from 'ws';


export interface OnSocketMessage<T=any> {
  $onSocketMessage: (message: T, ws: WebSocket) => void | Promise<void>;
}