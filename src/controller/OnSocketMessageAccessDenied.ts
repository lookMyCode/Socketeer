import { SocketContext } from '../SocketContext';


export interface OnSocketMessageAccessDenied<T=unknown> {
  $onSocketMessageAccessDenied: (message: T, context: SocketContext<any>) => void | Promise<void>;
}
