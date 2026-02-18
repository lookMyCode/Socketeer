# Lesson 4: Real-time Chat Room

**Goal**: enable messaging inside a specific chat room.

### 4.1 ChatController

This controller uses a parameter `:id` to identify the room.

Create `src/ChatController.ts`:

```typescript
// src/ChatController.ts
import { Controller, OnSocketConnect, OnSocketMessage } from "@dimski/socketeer";
import { AccessDeniedException, NotFoundException, BadRequestException } from "@dimski/socketeer";
import { SocketContext } from "@dimski/socketeer";
import { Payload } from "./Payload";
import { Store } from "./Store";

// ... Define interfaces for NewMessage / ReadMessage ...

export class ChatController extends Controller implements OnSocketConnect<Payload>, OnSocketMessage {

  async $onSocketConnect(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    const params = this.$getParams(); // Get :id from path
    const chat = Store.getChat(+params.id);

    if (!chat) throw new NotFoundException();
    if (!chat.members.some(m => m.id === userId)) throw new AccessDeniedException();

    this.$send(context, {
      event: 'connect',
      payload: { chat }
    });
  }

  async $onSocketMessage(message: any, context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    
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
  }

  private async onNewMessage(content: string, userId: number) {
    const params = this.$getParams();
    const newMessage = Store.addMessage({
      chatId: +params.id,
      userId,
      content,
    });

    // Broadcast to everyone currently in THIS room
    await this.$sendBroadcastMessage({
      event: 'new_message',
      payload: { newMessage }
    });
    
    // We will add notifications in Lesson 5!
  }
    
  private async onReadMessage(id: number, userId: number) {
      // similar logic...
  }
}
```

### 4.2 Register Route

Values in `path` starting with `:` are parameters.

```typescript
// src/routes.ts
import { ChatController } from "./ChatController";

export const routes: Route[] = [
  // ...
  {
    path: '/chats/:id', // parameterized path
    controller: ChatController,
    connectGuards: [], // AuthGuard is global!
    requestMessagePipes: [new BufferToStringPipe(), new JsonParsePipe()],
    responseMessagePipes: [new JsonStringifyPipe()],
  }
];
```

---

[← Previous Lesson: Listing Dialogs](lesson-3.md) | [Course Index](../COURSE.md) | [Next Lesson: System Notifications →](lesson-5.md)
