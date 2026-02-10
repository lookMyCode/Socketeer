import { SocketContext } from '../SocketContext';
export interface PipeTransform {
    transform: (message: any, context?: SocketContext) => unknown | Promise<unknown>;
}
