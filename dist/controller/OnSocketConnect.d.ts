import WebSocket from 'ws';
export interface OnSocketConnect {
    $onSocketConnect: (ws: WebSocket) => void | Promise<void>;
}
