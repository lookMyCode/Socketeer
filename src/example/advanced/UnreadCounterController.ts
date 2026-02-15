import { Controller, OnSocketClose, OnSocketConnect, OnSocketDestroy, OnSocketInit } from "../../controller";
import { NotifierSubscription } from "../../notifier";
import { SocketContext } from "../../SocketContext";
import { Payload } from "./Payload";
import { Store } from "./Store";


export class UnreadCounterController extends Controller
  implements OnSocketInit, OnSocketConnect<Payload>, OnSocketClose<Payload>, OnSocketDestroy {
  private sub!: NotifierSubscription;
  private connectedUsers = new Map<number, SocketContext<Payload>>();

  async $onSocketInit() {
    this.sub = this.$subscribePathNotifications(async ({ userId }: { userId: number }) => {
      const connectedUserCtx = this.connectedUsers.get(userId);
      if (!connectedUserCtx) return;

      await this.updateCounters(connectedUserCtx);
    });
  }

  async $onSocketConnect(context: SocketContext<Payload>) {
    this.connectedUsers.set(context.payload.userId, context);
    await this.updateCounters(context);
  }

  private async updateCounters(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const chats = Store.getChats();
    const counter = chats
      .filter(chat => chat.members.some(member => member.id === userId))
      .filter(chat => !chat.messages[0].readBy.includes(userId))
      .length;

    await this.$send(context, { counter });
  }

  $onSocketClose(code: number, reason: string | Buffer<ArrayBufferLike>, context: SocketContext<Payload>) {
    this.connectedUsers.delete(context.payload.userId);
  }

  $onSocketDestroy(): void | Promise<void> {
    this.sub.unsubscribe();
  }
}
