# Lesson 1: Foundation (Store & Server)

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

[Course Index](../COURSE.md) | [Next Lesson: Security (Authentication) →](lesson-2.md)
