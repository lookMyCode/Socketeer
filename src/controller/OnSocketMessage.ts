import { SocketContext } from '../SocketContext';


export interface OnSocketMessage<T=unknown> {
  $onSocketMessage: (message: T, context: SocketContext<any>) => void | Promise<void>;
}
