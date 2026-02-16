import { Controller, OnSocketClose, OnSocketConnect, OnSocketDestroy, OnSocketError, OnSocketInit, OnSocketMessage } from "../../controller";
import { SocketContext } from "../../SocketContext";


export class EndpointController extends Controller
  implements OnSocketInit, OnSocketConnect, OnSocketMessage, OnSocketError, OnSocketClose, OnSocketDestroy {

  async $onSocketInit() {
    const params = this.$getParams();
    console.log('First connect, controller was created');
    console.log('Params: ', params); // { id: '1' }
  }

  async $onSocketConnect(context: SocketContext<any>) {
    console.log('New connection: ', context);

    // All clients
    this.$forEachContext((context) => {
      console.log('Context: ', context);
    });
  }

  async $onSocketMessage(message: unknown, context: SocketContext<any>) {
    console.log('New message: ', message);
    console.log('It\'s context: ', context);
    this.$send(context, { ok: true }); // send response to client
    this.$sendBroadcastMessage(message); // send message to all clients
  }

  async $onSocketError(err: Error, context: SocketContext<unknown>) {
    console.error('Error: ', err);
    console.log('It\'s context: ', context);
  }

  async $onSocketClose(code: number, reason: string | Buffer<ArrayBufferLike>, context: SocketContext<unknown>) {
    console.log('Connection was close with code ', code, ', reason: ', reason);
    console.log('It\'s context: ', context);
  }

  async $onSocketDestroy() {
    console.log('Last connection was closed, controller was destroyed');
  }
}
