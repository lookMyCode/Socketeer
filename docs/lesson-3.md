# Lesson 3: Listing Dialogs

**Goal**: Allow users to see their list of chats.

### 3.1 ChatsController

This controller will handle the `/chats` endpoint. It sends the list of chats on connection and allows creating new chats.

Create `src/ChatsController.ts`:

```typescript
// src/ChatsController.ts
import { Controller, OnSocketConnect, OnSocketMessage } from "@dimski/socketeer";
import { SocketContext } from "@dimski/socketeer";
import { Payload } from "./Payload";
import { Store } from "./Store";

interface SocketMessage {
  event: 'new_chat';
  payload: { userId: number }
}

export class ChatsController extends Controller
  implements OnSocketConnect<Payload>, OnSocketMessage<SocketMessage> {

  async $onSocketConnect(context: SocketContext<Payload>) {
    await this.sendChats(context);
  }

  async $onSocketMessage(message: SocketMessage, context: SocketContext<Payload>) {
    if (message.event === 'new_chat') {
       await this.createChat([context.payload.userId, message.payload.userId]);
    }
  }

  private async sendChats(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const chats = Store.getChats().filter(chat => chat.members.some(m => m.id === userId));

    await this.$send(context, {
      event: 'chats',
      payload: { chats }
    });
  }

  private async createChat(membersIds: number[]) {
    const newChat = Store.addChat(membersIds);
    
    // Optimization: Broadcast ONLY to relevant users connected to this controller
    this.$forEachContext((ctx) => {
      // Check if this connected user is a member of the new chat
      if (membersIds.includes(ctx.payload.userId)) {
        this.$send(ctx, {
          event: 'new_chat',
          payload: { newChat }
        });
      }
    });
  }
}
```

### 3.2 Register Route

Create `src/routes.ts`:

```typescript
// src/routes.ts
import { Route, BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from "socketeer";
import { ChatsController } from "./ChatsController";
import { AuthGuard } from "./AuthGuard";

export const routes: Route[] = [
  {
    path: '/chats',
    controller: ChatsController,
    connectGuards: [], // AuthGuard is global!
    requestMessagePipes: [new BufferToStringPipe(), new JsonParsePipe()],
    responseMessagePipes: [new JsonStringifyPipe()],
  },
];
```

Update `main.ts` to use these routes.

```typescript
import { routes } from "./routes";

const socketeer = new Socketeer({
  // ...
  routes,
});
```

---

[← Previous Lesson: Security](lesson-2.md) | [Course Index](../COURSE.md) | [Next Lesson: Real-time Chat Room →](lesson-4.md)
