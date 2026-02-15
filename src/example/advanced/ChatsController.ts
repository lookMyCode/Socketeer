import { Controller, OnSocketClose, OnSocketConnect, OnSocketDestroy, OnSocketError, OnSocketInit, OnSocketMessage } from "../../controller";
import { NotifierSubscription } from "../../notifier";
import { SocketContext } from "../../SocketContext";
import { Payload } from "./Payload";
import { Store } from "./Store";


interface SocketMessage {
  event: 'new_chat';
  payload: {
    userId: number,
  }
}


export class ChatsController extends Controller
  implements OnSocketInit, OnSocketConnect<Payload>, OnSocketMessage<SocketMessage>, OnSocketClose<Payload>, OnSocketDestroy {
  private sub!: NotifierSubscription;
  private connectedUsers = new Map<number, {
    context: SocketContext<Payload>,
    chatsIds: number[],
  }>();
  private connectedChats = new Map<number, number[]>();

  async $onSocketInit() {
    this.sub = this.$subscribePathNotifications(async ({ chatId }: { chatId: number }) => {
      const connectedUsersIds = this.connectedChats.get(chatId);
      if (!connectedUsersIds) return;

      for (let connectedUserId of connectedUsersIds) {
        const data = this.connectedUsers.get(connectedUserId);
        if (!data) continue;

        await this.sendChats(data.context);
      }
    });
  }

  async $onSocketConnect(context: SocketContext<Payload>) {
    this.connectedUsers.set(context.payload.userId, { context, chatsIds: [] });
    await this.sendChats(context);
  }

  async $onSocketMessage(message: SocketMessage, context: SocketContext<Payload>) {
    const { event, payload } = message;

    switch (event) {
      case 'new_chat':
        return await this.createChat([context.payload.userId, payload.userId]);
    }
  }

  private async sendChats(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    let chats = Store.getChats();
    chats = chats.filter(chat => chat.members.some(member => member.id === userId));

    chats.forEach(chat => {
      this.connectedChats.set(chat.id, chat.members.map(member => member.id));
    });

    await this.$send(context, {
      event: 'chats',
      payload: {
        chats,
      }
    });
  }

  private async createChat(membersIds: number[]) {
    const newChat = Store.addChat(membersIds);
    const resp = {
      event: 'new_chat',
      payload: {
        newChat,
      }
    }

    this.$forEachContext((ctx) => {
      if (!membersIds.includes((ctx.payload as Payload).userId)) return;

      this.$send(ctx, resp);
    });
  }

  $onSocketClose(code: number, reason: string | Buffer<ArrayBufferLike>, context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const connectedUser = this.connectedUsers.get(userId);
    if (!connectedUser) return;

    connectedUser.chatsIds.forEach(id => {
      let connectedChat = this.connectedChats.get(id);
      if (!connectedChat) return;

      connectedChat = connectedChat.filter(uId => uId !== userId);

      if (!connectedChat.length) {
        this.connectedChats.delete(id);
      } else {
        this.connectedChats.set(id, connectedChat);
      }
    });

    this.connectedUsers.delete(userId);
  }

  $onSocketDestroy(): void | Promise<void> {
    this.sub.unsubscribe();
  }
}
