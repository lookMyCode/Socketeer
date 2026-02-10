import WebSocket from 'ws';
export interface OnSocketError {
    $onSocketError: (err: Error, ws: WebSocket) => void | Promise<void>;
}
