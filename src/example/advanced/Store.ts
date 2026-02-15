import { NotFoundException } from "../../exception";

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
    {
      id: 1,
      name: 'Adam Smith',
    },
    {
      id: 2,
      name: 'Jack Smile',
    },
    {
      id: 2,
      name: 'Harry Jey',
    },
  ];

  private static chats: Chat[] = [
    {
      id: 1,
      membersIds: [1, 2],
      messages: [
        {
          id: 1,
          content: 'Hello',
          readBy: [1, 2],
        },
        {
          id: 2,
          content: 'Hi',
          readBy: [1],
        },
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