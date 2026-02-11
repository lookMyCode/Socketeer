import { BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from "../pipe";
import { Route } from "../route";
import { ChatsController } from "./ChatsController";


export const routes: Route[] = [
  {
    path: 'chats',
    controller: ChatsController,
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  }
];
