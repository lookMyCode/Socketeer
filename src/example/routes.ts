import { BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from "../pipe";
import { Route } from "../route";
import { AuthGuard } from "./AuthGuard";
import { ChatsController } from "./ChatsController";


export const routes: Route[] = [
  {
    path: 'chats',
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
  }
];
