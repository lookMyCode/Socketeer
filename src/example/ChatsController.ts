import { Controller, OnSocketConnect } from "../controller";
import { SocketContext } from "../SocketContext";


export class ChatsController extends Controller implements OnSocketConnect {

  private chats = [
    {
      id: 1,
      name: 'First',
    },
    {
      id: 2,
      name: 'Second',
    },
    {
      id: 3,
      name: 'Thierd',
    },
  ];

  async $onSocketConnect(context: SocketContext<any>) {
    await this.$send(context, {
      event: 'connect',
      payload: {
        list: this.chats
      }
    });
  }
}
