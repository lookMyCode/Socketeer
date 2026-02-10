import { SocketContext } from '../SocketContext';
export interface CanActivateConnect {
    canActivate: (context: SocketContext) => boolean | Promise<boolean>;
}
