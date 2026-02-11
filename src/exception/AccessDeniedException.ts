import { SOCKETEER_STATUSES } from "../constants/SOCKETEER_STATUSES";
import { SocketeerException } from "./SocketeerException";


const s = SOCKETEER_STATUSES.ACCESS_DENIED;


export class AccessDeniedException extends SocketeerException {

  constructor(message: string = s.status) {
    super(message, s.code);
  }
}