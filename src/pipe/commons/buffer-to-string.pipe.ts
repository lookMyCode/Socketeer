import { PipeTransform } from '../PipeTransform';
import * as WebSocket from 'ws';

export class BufferToStringPipe implements PipeTransform {
  transform(value: any): string {
    if (Buffer.isBuffer(value)) {
      return value.toString();
    }
    if (value instanceof ArrayBuffer || Array.isArray(value)) { // Basic check
      return Buffer.from(value as any).toString();
    }
    return String(value);
  }
}
