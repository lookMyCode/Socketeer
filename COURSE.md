# Socketeer Advanced Course 🎓

Welcome to the **Advanced Socketeer Course**! In this series, we will build a production-ready Chat Application with multiple rooms, authentication, real-time unread counters, and system notifications.

We will use the code from `src/example/advanced` as our reference.

## 📚 Table of Contents

1.  [Lesson 1: Foundation (Store & Server)](#lesson-1-foundation-store--server)
2.  [Lesson 2: Security (Authentication)](#lesson-2-security-authentication)
3.  [Lesson 3: Listing Dialogs](#lesson-3-listing-dialogs)
4.  [Lesson 4: Real-time Chat Room](#lesson-4-real-time-chat-room)
5.  [Lesson 5: System Notifications (Unread Counter)](#lesson-5-system-notifications-unread-counter)
6.  [Lesson 6: Reliability (Errors & Rate Limiting)](#lesson-6-reliability-errors--rate-limiting)

---

## Lesson 1: Foundation (Store & Server)

**Goal**: Set up a mock database and initialize the Socketeer server.

### 1.1 The Mock Store

Since we don't have a real database, we'll create an in-memory `Store`. This class simulates database operations for Users, Chats, and Messages.

Create `src/Store.ts`:

```typescript
// src/Store.ts
import { NotFoundException } from "socketeer";

export interface Message {
  id: number;
  content: string;
  readBy: number[];
}

export interface User {
  id: number,
  name: string;
}

export interface Chat {
  id: number;
  messages: Message[];
  membersIds: number[];
}

export interface ChatWithMembers {
  id: number;
  messages: Message[];
  members: User[];
}

export class Store {
  private static users: User[] = [
    { id: 1, name: 'Adam Smith' },
    { id: 2, name: 'Jack Smile' },
    { id: 3, name: 'Harry Jey' },
  ];

  private static chats: Chat[] = [
    {
      id: 1,
      membersIds: [1, 2],
      messages: [
        { id: 1, content: 'Hello', readBy: [1, 2] },
        { id: 2, content: 'Hi', readBy: [1] },
      ],
    }
  ];

  static getChats(): ChatWithMembers[] {
    return this.chats.map(this.transformChat.bind(this));
  }

  static getChat(id: number): ChatWithMembers | null {
    const chat = this.chats.find(c => c.id === id);
    if (!chat) return null;
    return this.transformChat(chat);
  }

  static addChat(membersIds: number[]): ChatWithMembers {
    const chat = {
      membersIds,
      messages: [],
      id: Date.now(),
    }
    this.chats.push(chat);
    return this.transformChat(chat);
  }

  static addMessage({ chatId, content, userId }: { chatId: number, content: string, userId: number }) {
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) throw new NotFoundException();

    const message: Message = {
      id: Date.now(),
      content,
      readBy: [userId],
    }
    chat.messages.unshift(message);
    return message;
  }

  static markAsRead({ chatId, messageId, userId }: { chatId: number, messageId: number, userId: number }) {
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    const message = chat.messages.find(message => message.id === messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (!message.readBy.includes(userId)) message.readBy.push(userId);
  }

  private static transformChat(chat: Chat): ChatWithMembers {
    return {
      id: chat.id,
      messages: chat.messages,
      members: chat.membersIds.map(memberId => this.users.find(user => user.id === memberId)!),
    }
  }
}
```

### 1.2 Basic Server Setup

Now, let's create the entry point.

Create `src/main.ts`:

```typescript
// src/main.ts
import { Socketeer } from "socketeer";

const socketeer = new Socketeer({
  port: 3200,
  routes: [], // We will add routes later
  onInit() {
    console.log('Server running on port 3200');
  },
  onConnect() {
    console.log('=== New connection ===');
  },
});
```

Run your server! It won't do much yet, but it's alive.

---

## Lesson 2: Security (Authentication)

**Goal**: Identify users connecting to our WebSocket server.

### 2.1 Define Payload

We need a place to store the user ID in the connection context.

Create `src/Payload.ts`:

```typescript
// src/Payload.ts
export interface Payload {
  userId: number;
}
```

### 2.2 Create AuthGuard

The Guard will check for a `token` cookie. Explicitly type that the guard expects our `Payload`.

Create `src/AuthGuard.ts`:

```typescript
// src/AuthGuard.ts
import { IncomingMessage } from 'http';
import { CanActivateConnect, SocketContext } from 'socketeer';

export class AuthGuard implements CanActivateConnect {

  canActivate(context: SocketContext) {
    const token = this.getToken(context.request);
    const token = this.getToken(context.request);
    // Simple verification: in this example, the token IS the userId
    if (!token || isNaN(+token)) return false;

    // Attach user data to context
    context.payload = {
      userId: +token,
    }
    
    return true;
  }

  private getToken(req: IncomingMessage) {
    const cookies = req.headersDistinct.cookie;
    if (!cookies) return null;

    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if (!tokenCookie) return null;
    return tokenCookie.split('token=')[1];
  }
}
```

### 2.3 Register Global Guard

Update `src/main.ts` to enforce authentication for **all** connections.

```typescript
import { AuthGuard } from "./AuthGuard";

const socketeer = new Socketeer({
  // ...
  connectGuards: [
    new AuthGuard(),
  ],
});
```

Now, clients must send a `Cookie: token=1` header to connect.

---

## Lesson 3: Listing Dialogs

**Goal**: Allow users to see their list of chats.

### 3.1 ChatsController

This controller will handle the `/chats` endpoint. It sends the list of chats on connection and allows creating new chats.

Create `src/ChatsController.ts`:

```typescript
// src/ChatsController.ts
import { Controller, OnSocketConnect, OnSocketMessage } from "socketeer";
import { SocketContext } from "socketeer";
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

## Lesson 4: Real-time Chat Room

**Goal**: enable messaging inside a specific chat room.

### 4.1 ChatController

This controller uses a parameter `:id` to identify the room.

Create `src/ChatController.ts`:

```typescript
// src/ChatController.ts
import { Controller, OnSocketConnect, OnSocketMessage } from "socketeer";
import { AccessDeniedException, NotFoundException, BadRequestException } from "socketeer";
import { SocketContext } from "socketeer";
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

## Lesson 5: System Notifications (Unread Counter)

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

## Lesson 6: Reliability (Errors & Rate Limiting)

**Goal**: Make the server robust.

### 6.1 Custom Error Filter

Handle exceptions gracefully.

Create `src/CustomErrorFilter.ts`:

```typescript
// src/CustomErrorFilter.ts
import * as WebSocket from 'ws';
import { ErrorFilter, SocketeerException } from 'socketeer';

export class CustomErrorFilter extends ErrorFilter {

  public handleError(err: unknown, ws?: WebSocket) {
    if (err instanceof SocketeerException && ws) {
      if (ws.readyState === WebSocket.OPEN) {
          ws.close(err.code, err.message);
      }
      return;
    }
    
    console.error('Unhandled Error:', err);
  }
}
```

### 6.2 Rate Limiting

Protect your server from spam.

Update `src/main.ts`:

```typescript
import { CustomErrorFilter } from "./CustomErrorFilter";

const socketeer = new Socketeer({
  // ...
  errorFilter: new CustomErrorFilter(),
  rateLimit: {
    maxConnections: 10, // Max 10 concurrent connections total
    maxRequests: {
      counter: 10,  // Max 10 messages
      window: 1000, // per 1 second
    },
  },
});
```

## 🎉 Conclusion

You have built a fully functional Chat backend with Socketeer! You learned about:
- **Architecture**: Explicit controllers and routes.
- **Security**: Guards and Payloads.
- **Data Flow**: Pipes for transformation.
- **Communication**: Broadcasts and System Notifications.
- **Resilience**: Error Handling and Rate Limiting.
