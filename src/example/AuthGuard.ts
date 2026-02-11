import { CanActivateConnect } from "../guard";
import { SocketContext } from "../SocketContext";
import { IncomingMessage } from 'http';


export class AuthGuard implements CanActivateConnect {

  canActivate(context: SocketContext) {
    const token = this.getToken(context.request);
    if (token !== 'abc') return false;

    context.payload = {
      userId: 42,
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