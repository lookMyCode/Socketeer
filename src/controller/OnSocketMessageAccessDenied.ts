import WebSocket from 'ws';


export interface OnSocketMessageAccessDenied<T> {
  $onSocketMessageAccessDenied: (message: T, ws: WebSocket) => void | Promise<void>;
}
