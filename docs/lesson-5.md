# Lesson 5: System Notifications (Unread Counter)

**Goal**: Update the unread badge in real-time when a message arrives in *another* chat.

### 5.1 UnreadCounterController

This controller listens to system events using `$subscribePathNotifications`.

Create `src/UnreadCounterController.ts`:

```typescript
// src/UnreadCounterController.ts
import { Controller, OnSocketInit, OnSocketConnect } from "socketeer";
import { SocketContext } from "socketeer";
import { Payload } from "./Payload";
import { Store } from "./Store";

export class UnreadCounterController extends Controller
  implements OnSocketInit, OnSocketConnect<Payload> {
  
  // Track connected users to send updates to them
  private connectedUsers = new Map<number, SocketContext<Payload>>();

  async $onSocketInit() {
    // Listen for events targeting THIS controller/path
    this.$subscribePathNotifications(async ({ userId }: { userId: number }) => {
      const connectedUserCtx = this.connectedUsers.get(userId);
      if (connectedUserCtx) {
        await this.updateCounters(connectedUserCtx);
      }
    });
  }

  async $onSocketConnect(context: SocketContext<Payload>) {
    this.connectedUsers.set(context.payload.userId, context);
    await this.updateCounters(context);
  }
    
  async $onSocketClose(code: number, reason: string, context: SocketContext<Payload>) {
      this.connectedUsers.delete(context.payload.userId);
  }

  private async updateCounters(context: SocketContext<Payload>) {
    const userId = context.payload.userId;
    // Calculate unread count logic from Store...
    const counter = 10; // Simplified
    await this.$send(context, { counter });
  }
}
```

### 5.2 Triggering the Notification

Go back to `ChatController.ts` and dispatch the event when a new message is sent.

```typescript
// src/ChatController.ts

  private async onNewMessage(content: string, userId: number) {
    // ... save message ...

    // Notify other members to update their counters via the Internal Event Bus
    const chat = Store.getChat(+params.id);
    chat!.members
      .filter(member => member.id !== userId)
      .forEach(member => {
          // Send event to '/chats/unread' path
          this.$notifyPath('/chats/unread', { userId: member.id });
      });
  }
```

### 5.3 Register Route

```typescript
// src/routes.ts
import { UnreadCounterController } from "./UnreadCounterController";

export const routes: Route[] = [
  // ...
  {
    path: '/chats/unread',
    controller: UnreadCounterController,
    connectGuards: [new AuthGuard()],
    responseMessagePipes: [new JsonStringifyPipe()],
  }
];
```

---

[← Previous Lesson: Real-time Chat Room](lesson-4.md) | [Course Index](../COURSE.md) | [Next Lesson: Reliability →](lesson-6.md)
