import { Route } from "../route";
import { ChatsController } from "./ChatsController";


export const routes: Route[] = [
  {
    path: 'chats',
    controller: ChatsController,
  }
];
