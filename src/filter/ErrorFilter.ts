import * as WebSocket from 'ws';
import { SocketeerException } from '../exception/SocketeerException';


export class ErrorFilter {

  public handleError(err: unknown, ws?: WebSocket) {
    if (err instanceof SocketeerException && ws) {
      try {
        ws.readyState === WebSocket.OPEN && ws.close(err.code, err.message);
      } catch (e) {
        console.error(e);
      }
    }
    
    console.error(err);
  }
}
