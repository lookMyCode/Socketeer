# Socketeer Interactive Course 🎓

Welcome to the Socketeer Interactive Course! This step-by-step guide will take you from a basic WebSocket server to a complex, scalable chat application with rooms and notifications.

## Table of Contents

1. [Lesson 1: Hello World & Basic Chat](#lesson-1-hello-world--basic-chat)
2. [Lesson 2: Dynamic Rooms](#lesson-2-dynamic-rooms)
3. [Lesson 3: Unread Counter (Stateful Logic)](#lesson-3-unread-counter-stateful-logic)
4. [Lesson 4: Security & Validation](#lesson-4-security--validation)
5. [Lesson 5: System Events](#lesson-5-system-events)

---

## Lesson 1: Hello World & Basic Chat

**Goal:** Create a simple server that echoes messages back to the client.

### Step 1: Initialize the Server

Create a file `main.ts` and initialize Socketeer.

```typescript
// src/main.ts
import { Socketeer } from 'socketeer';

const server = new Socketeer({
  port: 3000,
  routes: [], // We'll add routes soon
  onInit: () => console.log('Server started on port 3000'),
});
```

### Step 2: Create a Controller

Create `ChatController.ts`. This class will handle our messages.

```typescript
// src/ChatController.ts
import { Controller, OnSocketMessage, SocketContext } from 'socketeer';

export class ChatController extends Controller implements OnSocketMessage {
  
  async $onSocketMessage(message: unknown, context: SocketContext) {
    console.log('Received:', message);
    
    // Echo the message back to the sender
    this.$send(context, { echo: message });
  }
}
```

### Step 3: Register the Route

Go back to `main.ts` and register the controller.

```typescript
// src/main.ts
import { ChatController } from './ChatController';

const server = new Socketeer({
  port: 3000,
  routes: [
    {
      path: '/chat',
      controller: ChatController
    }
  ],
  onInit: () => console.log('Server started on port 3000'),
});
```

### Try it out!

Run your server and connect with a WebSocket client (like Postman or a browser console) to `ws://localhost:3000/chat`. Send a message and watch the server echo it back!

---

## Lesson 2: Dynamic Rooms

**Goal:** Create multiple chat rooms using path parameters.

### Step 1: Update Route

Change the path to accept a `:roomId` parameter.

```typescript
// src/main.ts
routes: [
  {
    path: '/room/:roomId', // dynamic parameter
    controller: ChatController
  }
]
```

### Step 2: Use Parameters in Controller

Update `ChatController` to read the `roomId` and broadcast messages only to users in that room.

Remember: **Controllers are singletons per route**. This means for specific `roomId=1`, we have ONE instance of `ChatController`. For `roomId=2`, we have ANOTHER instance. This makes "rooms" logic automatic!

```typescript
// src/ChatController.ts
import { Controller, OnSocketInit, OnSocketConnect, OnSocketMessage, SocketContext } from 'socketeer';

export class ChatController extends Controller implements OnSocketInit, OnSocketConnect, OnSocketMessage {
  roomId: string;

  async $onSocketInit() {
    // This runs ONCE per room
    this.roomId = this.$getParams().roomId;
    console.log(`Room ${this.roomId} initialized!`);
  }

  async $onSocketConnect(context: SocketContext) {
    console.log(`User connected to room ${this.roomId}`);
  }
  
  async $onSocketMessage(message: unknown, context: SocketContext) {
    // Broadcast to everyone in THIS room (controller instance)
    // The framework handles isolation automatically!
    this.$sendBroadcastMessage({
      from: 'Anonymous', // Simplified for the example
      content: message,
      room: this.roomId
    });
  }
}
```

Now, users in `/room/1` will NOT see messages from `/room/2`.

---

## Lesson 3: Unread Counter (Stateful Logic)

**Goal:** Create a counter that increments when a new message is received.

### Step 1: Create the Counter Controller

This controller will handle the unread count.

```typescript
// src/UnreadController.ts
import { Controller, OnSocketConnect, SocketContext } from 'socketeer';

export class UnreadController extends Controller implements OnSocketConnect {
  $onSocketConnect(context: SocketContext) {
    this.$send(context, { unread: 0 });
  }
}
```

Add it to routes:
```typescript
{
  path: '/user/:userId/unread',
  controller: UnreadController
}
```

---

## Lesson 4: Security & Validation

**Goal:** Protect our chat and validte messages.

### Step 1: Create a Guard

We want to allow only users with a token.

```typescript
// src/AuthGuard.ts
import { CanActivateConnect, SocketContext } from 'socketeer';

export class AuthGuard implements CanActivateConnect {
  canActivate(context: SocketContext): boolean {
    const token = context.queryParams['token'];
    return token === 'secret123';
  }
}
```

### Step 2: Apply the Guard

In `main.ts`:
```typescript
routes: [
  {
    path: '/room/:roomId',
    controller: ChatController,
    connectGuards: [new AuthGuard()]
  }
]
```

### Step 3: Add Validation (Pipe)

Ensure messages are not empty strings.

```typescript
// src/NotEmptyPipe.ts
import { PipeTransform, SocketContext } from 'socketeer';

export class NotEmptyPipe implements PipeTransform {
  transform(value: any) {
    if (!value || value.trim() === '') {
      throw new Error('Message cannot be empty');
    }
    return value;
  }
}
```

Apply it in the route:
```typescript
{
  path: '/room/:roomId',
  controller: ChatController,
  connectGuards: [new AuthGuard()],
  requestMessagePipes: [new NotEmptyPipe()]
}
```

---

## Lesson 5: System Events

**Goal:** Notify `UnreadController` when a message is sent in `ChatController`.

### Step 1: Subscribe in UnreadController

```typescript
// src/UnreadController.ts
export class UnreadController extends Controller {
  // ...
  async $onSocketInit() {
    const { userId } = this.$getParams();
        
    // Listen for events targeting THIS user's unread path
    this.$subscribePathNotifications((event) => {
      if (event.type === 'NEW_MESSAGE') {
         this.$sendBroadcastMessage({ event: 'unread_inc', roomId: event.roomId });
      }
    });
  }
}
```

### Step 2: Publish in ChatController

```typescript
// src/ChatController.ts
export class ChatController extends Controller {
  // ...
  async $onSocketMessage(message: any, context: SocketContext) {
    // ... logic to send message ...
    
    // Notify the unread controller for a specific user
    // In a real app, you'd iterate over room participants
    const recipientId = '123'; 
    this.$notifyPath(`/user/${recipientId}/unread`, { 
      type: 'NEW_MESSAGE', 
      roomId: this.roomId 
    });
  }
}
```

Now your controllers are decoupled but communicating! 🎉

### Conclusion

You've built a modular, secure, and reactive WebSocket application with Socketeer. Experience the power of explicit architecture!
