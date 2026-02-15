import { SocketContext } from "../SocketContext";


export interface OnSocketClose<T=unknown> {
  $onSocketClose: (code: number, reason: string | Buffer<ArrayBufferLike>, context: SocketContext<T>) => void | Promise<void>;
}
