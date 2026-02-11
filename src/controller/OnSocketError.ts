import { SocketContext } from '../SocketContext';


export interface OnSocketError {
  $onSocketError: (err: Error, context: SocketContext<any>) => void | Promise<void>;
}