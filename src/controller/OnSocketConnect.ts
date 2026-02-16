import WebSocket from 'ws';
import { SocketContext } from '../SocketContext';


export interface OnSocketConnect<T=unknown> {
  $onSocketConnect: (context: SocketContext<T>) => void | Promise<void>;
}