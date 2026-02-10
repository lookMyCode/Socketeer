import { PipeTransform } from '../PipeTransform';
import { SocketeerException } from '../../exception/SocketeerException';

export class JsonParsePipe implements PipeTransform {
  transform(value: any) {
    try {
      if (typeof value === 'object') return value;
      return JSON.parse(value);
    } catch (e) {
      throw new SocketeerException('Invalid JSON', 400, false);
    }
  }
}
