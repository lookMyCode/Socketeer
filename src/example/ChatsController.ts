import { Controller, OnSocketConnect, OnSocketMessage } from "../controller";
import { BadRequestException } from "../exception";
import { SocketContext } from "../SocketContext";


type SocketMessageEvent = 'new_chat';

interface NewChat {
  name: string;
}

interface SocketMessage {
  event: SocketMessageEvent;
  payload: NewChat;
}


export class ChatsController extends Controller implements OnSocketConnect, OnSocketMessage<SocketMessage> {

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

  async $onSocketMessage(message: SocketMessage) {
    const { event, payload } = message;
    
    switch (event) {
      case 'new_chat': 
        return this.saveChat(payload);

      default:
        throw new BadRequestException('Invalid event');
    }
  }

  async saveChat(chat: NewChat) {
    const newChat = {
      ...chat,
      id: Date.now(),
    }
    
    this.chats.push(newChat);

    await this.$sendBroadcastMessage({
      event: 'new_chat',
      payload: newChat,
    });
  }
}
