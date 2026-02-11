import { SOCKETEER_STATUSES } from "../constants/SOCKETEER_STATUSES";
import { SocketeerException } from "./SocketeerException";


const s = SOCKETEER_STATUSES.NOT_FOUND;


export class NotFoundException extends SocketeerException {

  constructor(message: string = s.status) {
    super(message, s.code);
  }
}