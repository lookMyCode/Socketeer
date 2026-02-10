import * as WebSocket from 'ws';
import { SocketeerException } from '../exception/SocketeerException';

export class ErrorFilter {

  public handleError(err: unknown, ws?: WebSocket) {
    if (err instanceof SocketeerException) {
      if (err.close && ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(err.code, err.message);
        }
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'error',
          data: {
            message: err.message,
            code: err.code,
          }
        }));
      }
      return;
    }

    console.error(err);
  }
}
