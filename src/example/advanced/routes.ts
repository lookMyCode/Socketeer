import { BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from "../../pipe";
import { Route } from "../../route";
import { ChatsController } from "./ChatsController";
import { ChatController } from "./ChatController";
import { UnreadCounterController } from "./UnreadCounterController";
import { AuthGuard } from "./AuthGuard";


export const routes: Route[] = [
  {
    path: '/chats/unread',
    controller: UnreadCounterController,
    connectGuards: [
      new AuthGuard(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  },
  {
    path: '/chats',
    controller: ChatsController,
    connectGuards: [
      new AuthGuard(),
    ],
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  },
  {
    path: '/chats/:id',
    controller: ChatController,
    connectGuards: [
      new AuthGuard(),
    ],
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  }
];
