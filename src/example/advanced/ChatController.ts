import { Controller, OnSocketClose, OnSocketConnect, OnSocketDestroy, OnSocketError, OnSocketInit, OnSocketMessage } from "../../controller";
import { AccessDeniedException, BadRequestException, NotFoundException } from "../../exception";
import { SocketContext } from "../../SocketContext";
import { Payload } from "./Payload";
import { Store } from "./Store";


interface NewMessage {
  event: 'new_message',
  payload: {
    content: string;
  }
}

interface ReadMessage {
  event: 'read_message',
  payload: {
    id: number;
  }
}

type SocketMessage = NewMessage | ReadMessage;


export class ChatController extends Controller implements OnSocketConnect<Payload>, OnSocketMessage<SocketMessage> {

  async $onSocketConnect(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const params = this.$getParams();
    const chat = Store.getChat(+params.id);

    if (!chat) throw new NotFoundException();
    if (!chat.members.some(member => member.id === userId)) throw new AccessDeniedException();

    this.$send(context, {
      event: 'connect',
      payload: {
        chat,
      }
    });
  }

  async $onSocketMessage(message: SocketMessage, context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const params = this.$getParams();
    console.log(message)
    switch (message.event) {
      case 'new_message':
        await this.onNewMessage(message.payload.content, userId);
        break;

      case 'read_message':
        await this.onReadMessage(message.payload.id, userId);
        break;

      default:
        throw new BadRequestException();
    }

    this.$notifyPath('/chats', { chatId: +params.id });
  }

  private async onNewMessage(content: string, userId: number) {
    const params = this.$getParams();

    const newMessage = Store.addMessage({
      chatId: +params.id,
      userId,
      content,
    });

    await this.$sendBroadcastMessage({
      event: 'new_message',
      payload: {
        newMessage,
      }
    });

    const chat = Store.getChat(+params.id);
    chat!.members
      .filter(member => member.id !== userId)
      .forEach(member => this.$notifyPath('/chats/unread', { userId: member.id }));
  }

  private async onReadMessage(id: number, userId: number) {
    const params = this.$getParams();

    Store.markAsRead({
      chatId: +params.id,
      userId,
      messageId: id,
    });

    await this.$sendBroadcastMessage({
      event: 'read_message',
    });

    this.$notifyPath('/chats/unread', { userId });
  }
}
