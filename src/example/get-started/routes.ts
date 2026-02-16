import { BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from "../../pipe";
import { Route } from "../../route";
import { EndpointController } from "./EndpointController";


export const routes: Route[] = [
  {
    path: '/chat/:id',
    controller: EndpointController,
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  }
];
