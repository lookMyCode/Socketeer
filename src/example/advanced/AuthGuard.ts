import { IncomingMessage } from 'http';
import { CanActivateConnect } from '../../guard';
import { SocketContext } from '../../SocketContext';


export class AuthGuard implements CanActivateConnect {

  canActivate(context: SocketContext) {
    const token = this.getToken(context.request);
    if (! token || isNaN(+token)) return false;

    context.payload = {
      userId: +token,
    }
    
    return true;
  }

  private getToken(req: IncomingMessage) {
    const cookies = req.headersDistinct.cookie;
    if (!cookies) return null;

    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if (!tokenCookie) return null;
    return tokenCookie.split('token=')[1];
  }
}